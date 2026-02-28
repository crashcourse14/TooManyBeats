# TooManyBeats
Too Many Beats is a rythim game where you have to advoid obsticales of all difficulties.

## Game Version
Update (Beta) v1.0

## Leveling
All levels can be programmed, and modified in /levels/. 
Levels can have any type of name, just remeber to include it into the file system in game.js.
The levels are stored in a .json file. There are no rules for songs (be mature about what you pick).

## Example Level:
```
{
    "name": "Empty out your pockets - Juice WRLD",
    "song": "audio/test.mp3",
    "color": "#00ffff",
    "bpm": 128,
    "obstacleSpeed": 10,
    "spawnRate": 40,
    "speedRampRate": 0.000005,
    "numLanes": 2,
    "laneTheme": "ice",
    "beatDrop": 20,
    "beatCalms": 220,
    "BeatDropTimeMultiplyer": 2.1,
    "levelDuration": 220
}
```
