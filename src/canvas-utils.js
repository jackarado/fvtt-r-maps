export function xyFromEvent(event) {
  const ret = {
    x: event.interactionData.destination.x,
    y: event.interactionData.destination.y,
  };
  return ret;
}

export function xyInsideTargets({ x, y }) {
  return canvas.notes.placeables.filter((obj) => {
    if (
      !obj.visible
      || (
        obj.bounds instanceof PIXI.Rectangle
        && (
          x < obj.x - (0.5 * obj.bounds.width)
          || x > obj.x + (0.5 * obj.bounds.width)
          || y < obj.y - (0.5 * obj.bounds.height)
          || y > obj.y + (0.5 * obj.bounds.height)
        )
      )
    ) return false;
    return isNoteInside(obj, { x, y });
  });
}

export function isNoteInside(obj, { x, y }) {
  let ul = {
    x: obj.x,
    y: obj.y,
  };
  let lr = {
    x: (canvas.grid.type > 1 ? Math.max(...obj.bounds.points) : obj.bounds.width),
    y: (canvas.grid.type > 1 ? Math.max(...obj.bounds.points) : obj.bounds.height),
  };
  //console.log(obj, x, y, ul, lr);
  //console.log(Number.between(x, ul.x - lr.x, ul.x + lr.x) && Number.between(y, ul.y - lr.y, ul.y + lr.y));
  return Number.between(x, ul.x - lr.x, ul.x + lr.x) && Number.between(y, ul.y - lr.y, ul.y + lr.y);
}

export class Line extends PIXI.Graphics {
  constructor({ x, y }) {
    super();
    this.style = {
      width: 5,
      color: "0xFF0000",
    };

    this.origin = { x, y };
    canvas.app.stage.addChild(this);
  }

  update({ x, y }) {
    this.clear();
    this.lineStyle(this.style.width, this.style.color);
    this.moveTo(this.origin.x, this.origin.y);
    this.lineTo(x, y);
  }
}

export function getEdgeGivenTwoNodes(fromNode, toNode) {
  // This is the most BRUTE FORCE way I could see to guarantee that the
  // bounding box and corners and lines all match up correctly. It works. It
  // could be improved.

  const dx = Math.abs(fromNode.x - toNode.x);
  const dy = Math.abs(fromNode.y - toNode.y);

  // Calculate corners:
  const UL = { x: 0, y: 0 };
  const UR = { x: dx, y: 0 };
  const LL = { x: 0, y: dy };
  const LR = { x: dx, y: dy };


  // Find the corner we're starting in. We are therefore moving to the
  // opposite corner.
  // Moves clockwise, starting from the Upper Left
  let origin, destination;
  if (fromNode.x <= toNode.x && fromNode.y <= toNode.y) {
    origin = UL;
    destination = LR;
  } else if (fromNode.x > toNode.x && fromNode.y <= toNode.y) {
    origin = UR;
    destination = LL;
  } else if (fromNode.x <= toNode.x && fromNode.y > toNode.y) {
    origin = LL;
    destination = UR;
  } else if (fromNode.x > toNode.x && fromNode.y > toNode.y) {
    origin = LR;
    destination = UL;
  }

  // Now just prep the Drawing object:
  return {
    x: Math.min(fromNode.x, toNode.x),
    y: Math.min(fromNode.y, toNode.y),
    shape: {
      type: foundry.data.ShapeData.TYPES.POLYGON,
      width: dx,
      height: dy,
      points: [origin.x, origin.y, destination.x, destination.y],
    }
  };
}
