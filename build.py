#!/usr/bin/python3

import os
import json
import hashlib
from shutil import copy
from os.path import join
from spectre7 import utils

REQUIRED_FILES: list = ["manifest.json"]

INPUT_DIR: str = "src/"
OUTPUT_DIR: str = "dist/"

COMPILEDATA_PATH = ".tscompiledata.json"
current_compiledata = None

def cleanOutputDir():
    if not os.path.exists(OUTPUT_DIR):
        return
    
    for root, dirs, files in os.walk(OUTPUT_DIR):
        for file in files:
            if file.endswith(".js"):
                continue
            os.remove(join(root, file))
    
    for root, dirs, files in os.walk(OUTPUT_DIR):
        for dir in dirs:
            if len(os.listdir(join(root, dir))) == 0:
                os.rmdir(join(root, dir))

def getFileHash(path: str) -> str:
    f = open(path, "rb")
    data = f.read()
    f.close()
    return hashlib.md5(data).hexdigest()

def shouldRebuild():

    if not os.path.exists(COMPILEDATA_PATH):
        return True
    
    f = open(COMPILEDATA_PATH, "r")
    data: dict = json.loads(f.read())
    f.close()

    global current_compiledata
    current_compiledata = {}
    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if not file.endswith(".ts"):
                continue
            current_compiledata[join(root, file)] = None

    if len(data) != len(current_compiledata):
        return True
    
    for i, file in enumerate(current_compiledata.keys()):
        if file != list(data.keys())[i]:
            return True
        
        current_compiledata[file] = getFileHash(file)

        if current_compiledata[file] != data[file]:
            return True

    return False

def saveCompileData():

    global current_compiledata

    if current_compiledata is None:
        current_compiledata = {}
    
    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if not file.endswith(".ts"):
                continue
                
            file = join(root, file)

            if not file in current_compiledata or current_compiledata[file] is None:
                current_compiledata[file] = getFileHash(file)

    f = open(COMPILEDATA_PATH, "w")
    f.write(json.dumps(current_compiledata))
    f.close()

def build(force_rebuild: bool = False):
    cleanOutputDir()
    utils.ensureDirExists(OUTPUT_DIR)

    for file in REQUIRED_FILES:
        copy(file, OUTPUT_DIR)

    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith(".ts"):
                continue
            
            out = root.replace(INPUT_DIR, OUTPUT_DIR)
            utils.ensureDirExists(out)

            copy(join(root, file), join(out, file))
    
    if not force_rebuild and not shouldRebuild():
        print("No files modified, skipping TypeScript build")
        return
    
    os.system("tsc")

    saveCompileData()

if __name__ == "__main__":

    import sys
    args = sys.argv[1:]

    if len(args) == 0 or args[0] != "-f":
        build(False)
    else:
        build(True)