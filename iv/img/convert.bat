@echo off
echo Converting PNG files to optimized WebP...

:: Set quality level for both standard and preview WebP (0-100, lower = smaller file size but lower quality)
set QUALITY=85

:: Set lossless option (0=lossy, 1=lossless)
set LOSSLESS=0

:: Process all PNG files recursively
FOR /R %%a IN (*.png) DO (
    echo Converting: "%%a"
    
    REM Skip specific files if needed (uncomment and modify if needed)
    REM IF /I "%%~nxa" NEQ "logo.png" (
    
    :: Convert to standard WebP with optimized settings
    convert.ex "%%~a" -strip ^
        -define webp:lossless=%LOSSLESS% ^
        -define webp:method=6 ^
        -define webp:alpha-quality=100 ^
        -quality %QUALITY% ^
        "%%~dpna.webp"
    
    :: Progress indicator for standard WebP
    echo Created: "%%~dpna.webp"
    
    :: Convert to preview WebP (3x smaller dimensions) with _preview suffix
    convert.ex "%%~a" -strip ^
        -resize 50%% ^
        -define webp:lossless=%LOSSLESS% ^
        -define webp:method=6 ^
        -define webp:alpha-quality=100 ^
        -quality %QUALITY% ^
        "%%~dpna_preview.webp"
    
    :: Progress indicator for preview WebP
    echo Created: "%%~dpna_preview.webp"
    REM )
)

echo Conversion complete!
pause