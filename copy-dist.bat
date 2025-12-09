@echo off
echo 正在复制dist文件夹到目标位置...

REM 检查当前目录是否存在dist文件夹
if not exist "dist" (
    echo 错误：当前目录下不存在dist文件夹！
    pause
    exit /b 1
)

REM 检查目标目录是否存在，不存在则创建
if not exist "C:\Users\1\Documents\orca\plugins\srs" (
    echo 目标目录不存在，正在创建...
    mkdir "C:\Users\1\Documents\orca\plugins\srs"
)

REM 删除目标位置的旧dist文件夹（如果存在）
if exist "C:\Users\1\Documents\orca\plugins\srs\dist" (
    echo 正在删除旧的dist文件夹...
    rmdir /s /q "C:\Users\1\Documents\orca\plugins\srs\dist"
)

REM 复制dist文件夹到目标位置
echo 正在复制dist文件夹...
xcopy "dist" "C:\Users\1\Documents\orca\plugins\srs\dist" /E /I /H /Y

echo 复制完成！
pause