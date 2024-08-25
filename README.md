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

## Mods to synergize with

 - Advanced Drawing Tools
    - You can add nodes and add Smoothing Factor to get nice arcs, but as soon
      as you move any connected token, the line will snap back to being
      straight.
    - Since the lines are just _lines_, you can't apply fill to them. So no
      yarn styling yet.
    - No text-that-follows-line-arc yet.

 - Token Magic
    - Just having this enabled on your game will get some reasonable defaults
      on your edges.

 - Tokenizer
     - This is great for making tokens with a frame, such as the polaroid
       picture frame I used the demos.

 - Move That for You
    - Careful about this one; it is more likely to lead to trouble than just
      giving players ownership over tokens will.
    - Enable MT4U on tokens.
    - Then the GM can mark all tokens on the r-map sheet as moveable.
    - But the players should be careful not to draw lines from tokens they
      don't own, because that'll still fail, and leave the board in an ugly
      state.
