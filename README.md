# scoreboard_vgbootcampy_intermission

A VGBC-style intermission scoreboard overlay built for TournamentStreamHelper for educational purposes. Made as a practice to learn how to use JavaScript, HTML, and CSS.

![Preview Image](/index_preview.png)

## Recommendation
It is recommended to turn on the "Shutdown source when not visible" and "Refresh browser when scene becomes active" properties so that the starting animation plays and the scoreboard is updated properly whenever the scene with this scoreboard becomes active.

Also, it might be good to change line 286 in the FitText method in /layout/include/global.js from this:
```js
textElement.css("transform", "scaleX(" + scaleX + ")");
```
to this:
```js
textElement.css("transform", "scale(" + scaleX + ")");
```
so that the texts do not appear to be squished horizontally when they are really long.
