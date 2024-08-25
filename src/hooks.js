import { isTokenInside, Line, xyFromEvent, xyInsideTargets } from "./canvas-utils.js";
import { RMaps } from "./core.js";

// Inject tool into Tokens controls
Hooks.on("getSceneControlButtons", (buttons) => {
  RMaps.onGetSceneControlButtons(buttons);
});

Hooks.once("init", () => {
  game.socket.on("module.fvtt-r-maps", async (data) => {
    const { id, newEdges, tokenId } = data;
    if (game.users.activeGM?.isSelf && tokenId) {
      await canvas?.scene.tokens
        .get(tokenId)
        ?.setFlag("fvtt-r-maps", "r-maps-edges", newEdges);
      RMaps.drawEdge(id);
    }
  });
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
    "Token.prototype._canDragLeftStart",
    function (wrapped, user, event) {
      if (game.activeTool === "drawEdge") return true;
      return wrapped(user, event);
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "Token.prototype._onDragLeftStart",
    function (wrapped, ...args) {
      if (game.activeTool === "drawEdge") {
        if (canvas.tokens.controlledObjects.size === 1) {
          RMaps.state.originToken = this;
          RMaps.state.pixiLine = new Line(this.center);
          const spot = this.center;
          RMaps.state.pixiLine.update(spot);
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
          RMaps.state.pixiLine.update(spot);
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
            await RMaps.createEdge(
              RMaps.state.originToken.id,
              { to: target.id }
            );
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
  libWrapper.register(
    "fvtt-r-maps",
    "TokenLayer.prototype._canDragLeftStart",
    (wrapped, user, event) => {
      if (game.activeTool === "drawEdge") return true;
      return wrapped(user, event);
    },
    "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "TokenLayer.prototype._onDragLeftStart",
    (wrapped, event) => {
      if (game.activeTool === "drawEdge") {
        const spot = xyFromEvent(event);
        const token = canvas.tokens.placeables
          .filter((t) => t.visible)
          .find((t) => isTokenInside(t, spot));
        if (!token) {
          wrapped(event);
          return;
        }
        RMaps.state.originToken = token;
        RMaps.state.pixiLine = new Line(token.center);
        RMaps.state.pixiLine.update(spot);
      } else {
        wrapped(event);
      }
    }, "MIXED"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "TokenLayer.prototype._onDragLeftMove",
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
    "TokenLayer.prototype._onDragLeftCancel",
    async (wrapped, event) => {
      wrapped(event);
      RMaps.state.pixiLine?.clear();
      RMaps.state.pixiLine = null;
    }, "WRAPPER"
  );
  libWrapper.register(
    "fvtt-r-maps",
    "TokenLayer.prototype._onDragLeftDrop",
    async (wrapped, event) => {
      wrapped(event);
      if (game.activeTool === "drawEdge" && RMaps.state.pixiLine) {
        try {
          // Find if we picked a token:
          const spot = xyFromEvent(event);
          const targets = xyInsideTargets(spot);
          if (targets.length === 1) {
            // We have a winner.
            const target = targets[0];
            await RMaps.createEdge(
              RMaps.state.originToken.id,
              { to: target.id }
            );
          }
        } catch (_) {
          // Clean up:
          RMaps.state.pixiLine.clear();
          RMaps.state.pixiLine = null;
        }
      }
    }, "WRAPPER"
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
      .filter(([key, edge]) => edge.drawingId === drawing.id)
      .map(([key, edge]) => RMaps.deleteEdge(key))
  );
});
