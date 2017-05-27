@echo off

FOR /R %%a IN (*.png) DO ( 
   (Echo "%%a" | FIND /I "logo.png" 1>NUL) || (
       convert.ex "%%~a" -strip -resize x367 -background white -gravity center -extent 652x367 "%%~dpna.jpg"
   )
)
