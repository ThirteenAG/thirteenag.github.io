@echo off

FOR /R %%a IN (*.png) DO ( 
   (Echo "%%a" | FIND /I "logo.png" 1>NUL) || (
       convert.ex "%%~a" -strip -resize x367 -background white -gravity center -extent 652x367 "%%~dpna.jpg"
   )
)

convert.ex "./driverpl/main1.png" -strip -resize 652x -background white -gravity center -extent 652x "./driverpl/main1.jpg"
convert.ex "./driverpl/main2.png" -strip -resize 652x -background white -gravity center -extent 652x "./driverpl/main2.jpg"

convert.ex "./flatoutuc/main1.png" -strip -resize 652x -background white -gravity center -extent 652x "./flatoutuc/main1.jpg"
convert.ex "./flatoutuc/main2.png" -strip -resize 652x -background white -gravity center -extent 652x "./flatoutuc/main2.jpg"

convert.ex "./bully/main1.png" -strip -resize 652x -background white -gravity center -extent 652x "./bully/main1.jpg"
convert.ex "./bully/main2.png" -strip -resize 652x -background white -gravity center -extent 652x "./bully/main2.jpg"

convert.ex "./condemned/main1.png" -strip -resize 652x -background white -gravity center -extent 652x "./condemned/main1.jpg"
convert.ex "./condemned/main2.png" -strip -resize 652x -background white -gravity center -extent 652x "./condemned/main2.jpg"