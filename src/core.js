import { getEdgeGivenTwoNodes } from "./canvas-utils.js";

/*
 * We use graph theory terminology here (nodes, edges), so as to not collide
 * with all the other possible terms that already mean things in Foundry.
 */

export class RMaps {
  static state = {
    originNote: null,
    pixiLine: null,
  };

  // XXX: This should maybe be in our "operations" class?
  // TODO: insert this into Drawing tools, not Note tools.
  static onGetSceneControlButtons(buttons) {
    const noteTools = buttons.find((b) => b.name === "notes")?.tools;
    noteTools?.push({
      name: "drawEdge",
      title: "Draw a connection",
      icon: "fas fa-chart-network",
    });
  }

  static get allEdges() {
    const allEdges = (canvas?.scene.notes || []).reduce(
      (accumulator, note) => {
        const noteEdges = this.getEdgesForNote(note.id);

        return {
          ...accumulator,
          ...noteEdges,
        };
      },
      {}
    );

    return allEdges;
  }

  static getEdgesForNote(noteId) {
    return (
      canvas?.scene.notes.get(noteId)?.getFlag("fvtt-r-maps", "r-maps-edges") ||
      {}
    );
  }

  static async createEdge(noteId, edgeData) {
    const id = foundry.utils.randomID(16);

    if (this.checkDuplicates(noteId, edgeData.to)) return;

    const newEdge = {
      ...edgeData,
      fromId: noteId
    };
    const newEdges = {
      [id]: newEdge,
    };
    if (!game.user.isGM) {
      await game.socket.emit("module.fvtt-r-maps", { id, newEdges, noteId });
    } else {
      await canvas?.scene.notes
        .get(noteId)
        ?.setFlag("fvtt-r-maps", "r-maps-edges", newEdges);
        this.drawEdge(id);
    }
  }

  static checkDuplicates(a, b) {
    return Object.values(RMaps.allEdges).some((edge) => {
      return [a, b].includes(edge.to) && [a, b].includes(edge.fromId);
    });
  }

  static updateEdge(edgeId, updateData) {
    const relevantEdge = this.allEdges[edgeId];
    const update = {
      [edgeId]: updateData,
    };
    return canvas?.scene.notes
      .get(relevantEdge.fromId)
      ?.setFlag("fvtt-r-maps", "r-maps-edges", update);
  }

  static deleteEdge(edgeId) {
    const relevantEdge = this.allEdges[edgeId];
    // Foundry specific syntax required to delete a key from a persisted object
    // in the database
    const keyDeletion = {
      [`-=${edgeId}`]: null,
    };
    return canvas?.scene.notes
      .get(relevantEdge.fromId)
      ?.setFlag("fvtt-r-maps", "r-maps-edges", keyDeletion);
  }

  static deleteAllEdgesToAndFrom(note) {
    return Promise.all(
      Object.values(this.allEdges)
      .filter((edge) => edge.to === note.id || edge.fromId === note.id)
      .map((edge) => {
        const { drawingId } = edge;
        const drawing = canvas.scene.drawings.get(drawingId);
        return drawing?.delete();
      })
    );
  }

  /**
   *
   * @param {Note} note
   * @param {Object} node
   * @returns
   */
  static async updateEdgeDrawingsForNote(note, node = {}) {
    // Inbound edges:
    const inbound = Object.values(this.allEdges)
      .filter((edge) => edge.to === note.id)
      .map((edge) => {
        const { drawingId, fromId } = edge;
        const fromNode = canvas.scene.notes.get(fromId)?.object.center;
        const toNode = note.object.center;

        const newEdge = getEdgeGivenTwoNodes(fromNode, toNode);
        return {
          _id: drawingId,
          ...newEdge,
        };
      });
    // Outbound edges:
    const outbound = Object.values(this.getEdgesForNote(note.id)).map(
      (edge) => {
        const { drawingId, to } = edge;

        const fromNode = note.object.center;
        const toNode = canvas.scene.notes.get(to)?.object.center;

        const newEdge = getEdgeGivenTwoNodes(fromNode, toNode);
        return {
          _id: drawingId,
          ...newEdge,
        };
      }
    );
    // TODO: this is failing for some notes. I think the pattern is "non-PC
    // actors" and that may be because they're not getting their data stored
    // right?
    const updates = await canvas.scene.updateEmbeddedDocuments("Drawing", [
      ...inbound,
      ...outbound,
    ]);
    return updates;
  }

  // This pertains to Drawings:
  static async drawEdge(edgeId) {
    const relevantEdge = this.allEdges[edgeId];
    const fromNode = canvas?.scene.notes.get(relevantEdge.fromId)._object
      .center;
    const toNode = canvas?.scene.notes.get(relevantEdge.to)._object.center;

    const edge = {
      ...getEdgeGivenTwoNodes(fromNode, toNode),
      strokeWidth: 5,
      strokeAlpha: 1,
      strokeColor: "#ff0000",
    };

    const [drawing] = await canvas.scene.createEmbeddedDocuments("Drawing", [
      edge,
    ]);

    //If we have Tokenmagic set up, apply some default filters:
    if (game.modules.get('tokenmagic')?.active) {
      let params = [
        {
          filterType: "liquid",
          filterId: "yarnMantle",
          time: 0,
          blend: 5,
          spectral: false,
          scale: 7,
          animated: {
            time: {
              active: true,
              speed: 0.0000000015,
              animType: "move",
            },
            scale: {
              active: true,
              animType: "cosOscillation",
              loopDuration: 300,
              loops: 1,
              val1: 10,
              val2: 0.5,
            },
          },
        },
        {
          filterType: "shadow",
          filterId: "yarnShadow",
          rotation: 35,
          blur: 2,
          quality: 5,
          distance: 10,
          alpha: 0.7,
          padding: 10,
          shadowOnly: false,
          color: 0x000000,
          zOrder: 6000,
        },
      ];
      await TokenMagic.addFilters(drawing.object, params);
    }
    this.updateEdge(edgeId, { drawingId: drawing._id });
    return drawing;
  }
}
