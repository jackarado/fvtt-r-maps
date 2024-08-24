import { Line, xyFromEvent, xyInsideTargets } from "./canvas-utils.js";
import { RMaps } from "./core.js";

// Inject tool into Tokens controls
Hooks.on("getSceneControlButtons", (buttons) => {
  RMaps.onGetSceneControlButtons(buttons);
});

Hooks.on("libWrapper.Ready", () => {
  // Reset all the wrappers for this module:
  libWrapper.unregister_all("fvtt-r-maps");

  // Handle drags from Token:
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._canDrag",
    function (wrapped, ...args) {
      return wrapped(...args) || game.activeTool === "drawEdge";
    },
    "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._onDragLeftStart",
    function (wrapped, ...args) {
      if (game.activeTool === "drawEdge") {
        if (canvas.tokens.controlledObjects.size === 1) {
          RMaps.state.originToken = this;
          const pixiLine = (RMaps.state.pixiLine = new Line(this.center));
          const spot = this.center;
          pixiLine.update(spot);
          return;
        } else {
          ui.notifications.warn(`You must have only 1 token selected.`);
        }
      } else {
        return wrapped(...args);
      }
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._onDragLeftMove",
    (wrapped, event) => {
      if (game.activeTool === "drawEdge") {
        if (canvas.tokens.controlledObjects.size === 1) {
          const spot = xyFromEvent(event);
          const pixiLine = RMaps.state.pixiLine;
          pixiLine.update(spot);
          return;
        }
      } else {
        return wrapped(event);
      }
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._onDragLeftCancel",
    async (wrapped, event) => {
      wrapped(event);
      RMaps.state.pixiLine?.clear();
      RMaps.state.pixiLine = null;
    },
    "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._onDragLeftDrop",
    async (wrapped, event) => {
      if (
        game.activeTool === "drawEdge" &&
        canvas.tokens.controlledObjects.size === 1
      ) {
        try {
          // Find if we picked a token:
          const spot = xyFromEvent(event);
          const targets = xyInsideTargets(spot);
          if (targets.length === 1) {
            // We have a winner.
            const target = targets[0];
            const edgeId = await RMaps.createEdge(
              RMaps.state.originToken.id,
              { to: target.id }
            );
            RMaps.drawEdge(edgeId);
          }
        } catch (_) {
          // Clean up:
          RMaps.state.pixiLine?.clear();
          RMaps.state.pixiLine = null;
        }
      } else {
        return wrapped(event);
      }
    },
    "MIXED"
  );
});

// Trigger redrawing edges when a token moves:
Hooks.on("updateToken", (token, change) => {
  if (!game.user.isGM) return;
  if (["x", "y", "width", "height"].some((c) => c in change)) {
    const { x, y } = change;
    RMaps.updateEdgeDrawingsForToken(token, { x, y });
  }
});

Hooks.on("preDeleteToken", async (token) => {
  await RMaps.deleteAllEdgesToAndFrom(token);
});

// Handle destroying edge data when the linked drawing is deleted:
Hooks.on("preDeleteDrawing", async (drawing) => {
  await Promise.all(
    Object.entries(RMaps.allEdges)
      .filter((key, edge) => edge.drawingId === drawing.id)
      .map((key, edge) => RMaps.deleteEdge(key))
  );
});
