# FVTT R-Maps

This is a tool to help you make r-maps, a.k.a. relationship maps, Anacapa
charts, conspiracy maps, in your Foundry VTT game.

Place tokens, draw lines between them, and have those lines automatically
update as you move the tokens around.

![A small r-map of five superheroes on a corkboard](docs/r-maps.png)

## How-to

 1. Make a scene for your r-map.
    - I like to use a cork-board background.
    - Disable the scene's Token Vision config.
 2. Add tokens for your actors that you want to connect on the map.
    - I like to put these tokens in little polaroid-picture frames and rotate
      them randomly a few degrees left or right. It adds to the _aesthetic_.
 3. Click on the Draw a Connection control button.
 4. Draw a line, dragging from one token to another.
    - Optionally, once your lines are all set, users with
      drawing permissions can add labels to them, or restyle them, or use
      `advanced-drawing-tools` to add some intermediate points in them and
      curve them.

## About R-Maps

[Paul's R-Map Method](https://www.indiegamereadingclub.com/indie-game-reading-club/pauls-r-map-method/)

## Compatibility with the Drag Ruler module
If you're using the Drag Ruler module, follow these steps to guarantee both modules work correctly.


1. Go to Game Settings > libWrapper > libWrapper Settings Menu.
2. Move R-Maps to the Prioritized Packages box (select it and click the up arrow above it).
    - If Drag Ruler is also Prioritized, position R-Maps above it in there.
3. Save and reload.

## Mods to synergize with

 - Advanced Drawing Tools
    - You can add nodes and add Smoothing Factor to get nice arcs.
    - Since the lines are just _lines_, you can't apply fill to them. So no
      yarn styling yet.
    - No text-that-follows-line-arc yet.

 - Token Magic
    - Just having this enabled on your game will get some reasonable defaults
      on your edges.
