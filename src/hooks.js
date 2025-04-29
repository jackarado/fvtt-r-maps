import { isNoteInside, Line, xyFromEvent, xyInsideTargets } from "./canvas-utils.js";
import { RMaps } from "./core.js";

// Inject tool into Notes controls
Hooks.on("getSceneControlButtons", (buttons) => {
  RMaps.onGetSceneControlButtons(buttons);
});

Hooks.once("init", () => {
  game.socket.on("module.fvtt-r-maps", async (data) => {
    const { id, newEdges, noteId } = data;
    if (game.users.activeGM?.isSelf && noteId) {
      await canvas?.scene.notes
        .get(noteId)
        ?.setFlag("fvtt-r-maps", "r-maps-edges", newEdges);
      RMaps.drawEdge(id);
    }
  });
});

Hooks.on("libWrapper.Ready", () => {
  // Reset all the wrappers for this module:
  libWrapper.unregister_all("fvtt-r-maps");

  // Handle drags from Note:
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._canDrag",
    function (wrapped, ...args) {
      return wrapped(...args) || game.activeTool === "drawEdge";
    },
    "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._canDragLeftStart",
    function (wrapped, user, event) {
      if (game.activeTool === "drawEdge") return true;
      return wrapped(user, event);
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._onDragLeftStart",
    function (wrapped, ...args) {
      if (game.activeTool === "drawEdge") {
        //if (canvas.notes.controlledObjects.size === 1) {
          RMaps.state.originNote = this;
          RMaps.state.pixiLine = new Line(this.center);
          const spot = this.center;
          RMaps.state.pixiLine.update(spot);
          return;
        // } else {
        //   ui.notifications.warn(`You must have only 1 note selected.`);
        // }
      } else {
        return wrapped(...args);
      }
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._onDragLeftMove",
    (wrapped, event) => {
      if (game.activeTool === "drawEdge") {
        //if (canvas.notes.controlledObjects.size === 1) {
          const spot = xyFromEvent(event);
          RMaps.state.pixiLine.update(spot);
          return;
        //}
      } else {
        return wrapped(event);
      }
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._onDragLeftCancel",
    async (wrapped, event) => {
      wrapped(event);
      RMaps.state.pixiLine?.clear();
      RMaps.state.pixiLine = null;
    },
    "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Note.prototype._onDragLeftDrop",
    async (wrapped, event) => {
      if (
        game.activeTool === "drawEdge" //&&
        //canvas.notes.controlledObjects.size === 1
      ) {
        _onDragLeftDrop(event);
      } else {
        return wrapped(event);
      }
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "NotesLayer.prototype._canDragLeftStart",
    (wrapped, user, event) => {
      if (game.activeTool === "drawEdge") return true;
      return wrapped(user, event);
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "NotesLayer.prototype._onDragLeftStart",
    (wrapped, event) => {
      if (game.activeTool === "drawEdge") {
        const spot = xyFromEvent(event);
        const note = canvas.notes.placeables
          .filter((t) => t.visible)
          .find((t) => isNoteInside(t, spot));
        if (!note) {
          wrapped(event);
          return;
        }
        RMaps.state.originNote = note;
        RMaps.state.pixiLine = new Line(note.center);
        RMaps.state.pixiLine.update(spot);
      } else {
        wrapped(event);
      }
    }, "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "NotesLayer.prototype._onDragLeftMove",
    (wrapped, event) => {
      wrapped(event);
      if (game.activeTool === "drawEdge" && RMaps.state.pixiLine) {
        const spot = xyFromEvent(event);
        RMaps.state.pixiLine.update(spot);
      }
    }, "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "NotesLayer.prototype._onDragLeftCancel",
    async (wrapped, event) => {
      wrapped(event);
      RMaps.state.pixiLine?.clear();
      RMaps.state.pixiLine = null;
    }, "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "NotesLayer.prototype._onDragLeftDrop",
    async (wrapped, event) => {
      wrapped(event);
      if (game.activeTool === "drawEdge" && RMaps.state.pixiLine) {
        _onDragLeftDrop(event);
      }
    }, "WRAPPER"
  );
});

async function _onDragLeftDrop(event) {
  try {
    // Find if we picked a note:
    const spot = xyFromEvent(event);
    const targets = xyInsideTargets(spot);
    if (targets.length === 1) {
      // We have a winner.
      const target = targets[0];
      await RMaps.createEdge(
        RMaps.state.originNote.id,
        { to: target.id }
      );
    }
  } catch (_) {
    // Clean up:
    RMaps.state.pixiLine?.clear();
    RMaps.state.pixiLine = null;
  }
}

// Trigger redrawing edges when a note moves:
Hooks.on("updateNote", (note, change) => {
  if (!game.user.isGM) return;
  if (["x", "y", "width", "height"].some((c) => c in change)) {
    const { x, y } = change;
    RMaps.updateEdgeDrawingsForNote(note, { x, y });
  }
});

Hooks.on("preDeleteNote", async (note) => {
  await RMaps.deleteAllEdgesToAndFrom(note);
});

// Handle destroying edge data when the linked drawing is deleted:
Hooks.on("preDeleteDrawing", async (drawing) => {
  await Promise.all(
    Object.entries(RMaps.allEdges)
      .filter(([key, edge]) => edge.drawingId === drawing.id)
      .map(([key, edge]) => RMaps.deleteEdge(key))
  );
});
