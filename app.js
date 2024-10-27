import { open, unlink, watch, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { resolve } from "node:path";

const cmds = {
  CREATE_FILE: "create a file",
  DELETE_FILE: "delete a file",
}

const operations = {
  [cmds.CREATE_FILE]: createFile,
  [cmds.DELETE_FILE]: deleteFile,
}

async function run(){

  // OPEN A FILE | WHENEVER WE USE open WE ARE NOT ACTUALLY READING THE FILE
  // WHAT WE ARE DOING IS ASSINGING A NUMBER(UNIQUE) IN MEMORY FOR THAT FILE
  // LATER WE CAN READ AND WRITE USING THAT. WE CALL THIS "FILE DESCRIPTOR"
  const commandFileHandler = await open("command.txt", "r"); // "r" ONLY ALLOWS READING

  // ALL FILE HANDLES EXTENDS EVENTEMITTERS
  // READ WHEN CHANGE HAPPENS
  commandFileHandler.on("change", () => readTheFileChanges(commandFileHandler))

  // watch CAN CHECK WHOLE DIRECTORY OR JUST A FILE
  const watcher = watch("command.txt")

  for await (const event of watcher) {
    if(event.eventType === "change") {
      commandFileHandler.emit("change");
    } 
  }

  // CLOSING THE FILE IS IMPORTANT! IF NOT, THIS MIGHT CAUSE MEMORY LEAKS
  commandFileHandler.close()
}

run();

async function readTheFileChanges(commandFileHandler) {
  const size = (await commandFileHandler.stat()).size
  const content = await commandFileHandler.read(Buffer.alloc(size), {
    offset: 0,
    length: size,
    position: 0, // FROM WHAT POSITION TO READ THE FILE FROM | SET TO 0 OTHERWISE IT WILL UPDATE EVERYTIME
  })

  const userCmd = content.buffer.toString("utf8");
  let filePath = undefined;

  if(userCmd.includes(cmds.CREATE_FILE)){
    filePath = userCmd.substring(cmds.CREATE_FILE.length + 1)
    await operations[cmds.CREATE_FILE](filePath)
  } else if(userCmd.includes(cmds.DELETE_FILE)) {
    filePath = userCmd.substring(cmds.DELETE_FILE.length + 1)
    await operations[cmds.DELETE_FILE](filePath)
  } else {
    console.log("COMMAND NOT VALID")
  }
}

// create a file <path>
async function createFile(filePath) {
  try {
    await writeFile(resolve(filePath), "")
    console.info("FILE CREATED")
  } catch (err) {
    console.error(err);
  }
}

// delete a file <path>
async function deleteFile(filePath) {
  try {
    await unlink(filePath);
    console.info("FILE DELETED")
  } catch (err) {
    if(err.code === "ENOENT") {
      console.log("no file exist");
    } else {
      console.error(err)
    }
  }
}