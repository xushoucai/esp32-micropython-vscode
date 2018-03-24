'use strict';
const walk  = require('walk');
import * as fs from 'fs';
import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';


class ESP32Micropython {

    private _terminal: vscode.Terminal;
    private _status: vscode.StatusBarItem;
    private _outputChannel: vscode.OutputChannel;

    constructor() {
        this._status        = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._terminal      = vscode.window.createTerminal("ESP32 Micropython");
        this._outputChannel = vscode.window.createOutputChannel("ESP32 Micropython");
    }

    initial() {
        this._status.text   = "ESP32: Done!";
        this._status.show();
    }

    createNewProject() {
        vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Create..."
        }).then(async (values) => {
            values = values || [];
            if (!values.length) { return; }
            let selectedDir: string = values[0].fsPath;
            this._outputChannel.clear();
            this._outputChannel.show();
            
            this._outputChannel.appendLine("[ESP32 Micropython]: Checking " + selectedDir + "...");
            if (fs.existsSync(path.join(selectedDir, "micropy-config.json"))) {
                this._outputChannel.appendLine("[ESP32 Micropython]: Oop, this directory already included a config file (micropy-config.json). Is this your old project?");
                return;
            }

            let configData: any = {
                "upload-port": "",
                "upload-baud": 115200,
                "upload-excludes-extensions": ["json"],
                "upload-excludes-directories": [".vscode"]
            };

            var portsList: string[] = ["Not in this list?"];
            try {
                this._outputChannel.appendLine("[ESP32 Micropython]: Getting ports...");
                fs.readdirSync("/dev/").forEach((portItem) => {
                    if (
                        portItem.startsWith("COM") ||
                        (portItem.length >= 16 && (portItem.startsWith("tty.")))
                    )
                    { portsList.push(portItem); }
                });
            }
            catch (exception) {  }

            var port = await vscode.window.showQuickPick(portsList);
            
            if (port && port !== "Not in this list?") {
                port = "/dev/" + port;
            }

            if (port === "Not in this list?") {
                port = await vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    password: false,
                    placeHolder: "ex. /dev/tty.SLAB_USBtoUART",
                    prompt: "Please enter your ESP32 device port."
                });
            }

            if (!port) {
                this._outputChannel.appendLine("[ESP32 Micropython]: Port is not config already, task stopped!");
                return;
            }

            if (!fs.existsSync(port)) {
                this._outputChannel.appendLine("[ESP32 Micropython]: Port not found, task stopped!");
                return;
            }

            configData["upload-port"] = port;
            let baudRate = await vscode.window.showQuickPick(["300", "600", "1200", "2400", "4800", "9600", "14400", "19200", "28800", "38400", "57600", "115200", "128000", "256000"], {
                ignoreFocusOut: true,
                placeHolder: "Please select baudrate (ESP32 recommend 115200)"
            });

            if (!baudRate) {
                this._outputChannel.appendLine("[ESP32 Micropython]: Invalid baud rate, task stopped!");
                return;
            }

            this._outputChannel.appendLine("[ESP32 Micropython]: Generating config file...");
            configData["upload-baud"] = parseInt(baudRate) || 115200;
            try {
                fs.writeFileSync(path.join(selectedDir, "micropy-config.json"), JSON.stringify(configData, null, 2) + "\n");
                this._outputChannel.appendLine("[ESP32 Micropython]: Generate project files...");
                fs.writeFileSync(path.join(selectedDir, "main.py"), "# This is your main project file\n\n\nprint(\"Hello, world!\")\n");
                fs.writeFileSync(path.join(selectedDir, "boot.py"), "# This file will open after device boot or wake from deep sleep...\n\n\n");
                vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.parse(selectedDir));
                this._outputChannel.appendLine("[ESP32 Micropython]: Done!");
            } catch (exception) {
                this._outputChannel.appendLine("[ESP32 Micropython]: Error while preparing project. I am sorry for this problem, if make you trouble, please contact me via dinophan94@gmail.com. I'm sorry for take your time...");
            }
        });
    }

    pushActiveFile(hasRequestSerialMonitor: boolean) {
        this._status.text   = "[ESP32 Micropython]: Pushing single file...";
        this._outputChannel.clear();
        this._outputChannel.appendLine("*********************************************");
        this._outputChannel.appendLine("* This extension current optimized for OSX, *");
        this._outputChannel.appendLine("* if you have any trouble with your operat- *");
        this._outputChannel.appendLine("* ion system. Please contact me via         *");
        this._outputChannel.appendLine("* dinophan94@gmail.com. Thanks you!         *");
        this._outputChannel.appendLine("*********************************************");
        this._outputChannel.show();

        this._outputChannel.append("[ESP32 Micropython]: Checking current active editor...");
        if (!vscode.window.activeTextEditor) {
            this._status.text   = "ESP32: Done!";
            this._outputChannel.appendLine("\n[ESP32 Micropython]: Nothing to push!");
            return;
        }
        this._outputChannel.appendLine("OK!");

        this._outputChannel.append("[ESP32 Micropython]: Checking programing language...");
        if (vscode.window.activeTextEditor.document.languageId !== "python") {
            this._status.text   = "ESP32: Done!";
            this._outputChannel.appendLine("\n[ESP32 Micropython]: Sorry, only .py files can be push!");
            return;
        }
        this._outputChannel.appendLine("OK!");

        this._outputChannel.append("[ESP32 Micropython]: Checking project root...");
        if (!vscode.workspace.rootPath) {
            this._status.text   = "ESP32: Done!";
            this._outputChannel.appendLine("\n[ESP32 Micropython]: Sorry, unknown current project path!");
            return;
        }
        this._outputChannel.appendLine("OK!");

        if (!vscode.window.activeTextEditor.document.fileName) {
            this._status.text   = "ESP32: Done!";
            this._outputChannel.appendLine("[ESP32 Micropython]: Sorry, unknown current file path!");
            return;
        }

        this._outputChannel.append("[ESP32 Micropython]: Reading settings from micropy-config.json...");
        let fileName = path.basename(vscode.window.activeTextEditor.document.fileName);
        vscode.workspace.openTextDocument(vscode.Uri.file(vscode.workspace.rootPath + '/micropy-config.json')).then(async (document: vscode.TextDocument) => {
            try {
                let configObject    = JSON.parse(document.getText());
                this._outputChannel.appendLine("OK!");
                let uploadPort      = configObject['upload-port'];
                let uploadBaudRate  = configObject['upload-baud'] || 115200;
                this._status.text   = "ESP32: Pushing " + fileName + "...";
                this._outputChannel.appendLine("[ESP32 Micropython]: Pushing...");
                await this.newExecFromPromise("ampy --port " + uploadPort + " --baud " + uploadBaudRate + " put ./" + fileName);
                vscode.window.showInformationMessage(fileName + " has been pushed successfully!");
                this._outputChannel.appendLine("[ESP32 Micropython]: All done!");
            } catch (exception) {
                this._outputChannel.appendLine("\n[ESP32 Micropython]: Error while reading settings from `micropy-config.json`. Please recheck config file then try again!");
            } finally {
                this._status.text   = "ESP32: Done!";
                if (hasRequestSerialMonitor) {
                    this.displaySerialTerminal();
                }
            }
        });
    }

    pushProject() {
        this._status.text   = "ESP32: Pushing all files in project...";
        this._outputChannel.clear();
        this._outputChannel.appendLine("*********************************************");
        this._outputChannel.appendLine("* This extension current optimized for OSX, *");
        this._outputChannel.appendLine("* if you have any trouble with your operat- *");
        this._outputChannel.appendLine("* ion system. Please contact me via         *");
        this._outputChannel.appendLine("* dinophan94@gmail.com. Thanks you!         *");
        this._outputChannel.appendLine("*********************************************");
        this._outputChannel.show();

        this._outputChannel.append("[ESP32 Micropython]: Checking project root directory...");
        if (!vscode.workspace.rootPath) {
            this._status.text   = "ESP32: Done!";
            this._outputChannel.appendLine("\n[ESP32 Micropython]: Sorry, unknown current project's path!");
            return;
        }
        this._outputChannel.appendLine("OK!");

        let walker  = walk.walk(vscode.workspace.rootPath);
        let dirs: string[]  = [];
        let files: string[] = [];

        walker.on('directory', (root: string, stat: any, next: Function) => {
            let rootPath        = vscode.workspace.rootPath || '';
            dirs.push(root.replace(rootPath, '') + '/' + stat.name);
            next();
        });

        walker.on('file', (root: string, stat: any, next: Function) => {
            let rootPath        = vscode.workspace.rootPath || '';
            let relativePath    = root.replace(rootPath, '.') + '/';
            if (stat.name !== "micropy-config.json") {
                files.push(relativePath + stat.name);
            }
            next();
        });

        walker.on('end', () => {
            this._outputChannel.append("[ESP32 Micropython]: Reading settings from micropy-config.json...");
            vscode.workspace.openTextDocument(vscode.Uri.file(vscode.workspace.rootPath + '/micropy-config.json')).then(async (document: vscode.TextDocument) => {
                try {
                    let configObject    = JSON.parse(document.getText());
                    this._outputChannel.appendLine("OK!");
                    let uploadPort      = configObject['upload-port'];
                    let uploadBaudRate  = configObject['upload-baud'] || 115200;
                    let uploadExcldExt  = configObject['upload-excludes-extensions'] || [];
                    let uploadExcldDir  = configObject['upload-excludes-directories'] || [];
                    await this.formatAllData();

                    this._outputChannel.appendLine("[ESP32 Micropython]: Scanning files and directories...");
                    var tempDirs: string[] = [];
                    dirs.forEach((dirPath) => {
                        var isExcluded = false;
                        for (var i = 0; i < uploadExcldDir.length; i++) {
                            if (path.basename(dirPath) === uploadExcldDir[i]) {
                                isExcluded = true;
                                break;
                            }
                        }
                        if (!isExcluded) {
                            tempDirs.push(dirPath);
                            this._outputChannel.appendLine("[ESP32 Micropython]:    - Added: " + dirPath);
                        }
                    });
                    dirs = tempDirs;

                    var tempFiles: string[] = [];
                    files.forEach((fileName) => {
                        var isExcluded = false;
                        for (var i = 0; i < uploadExcldExt.length; i++) {
                            if (fileName.endsWith(uploadExcldExt[i])) {
                                isExcluded = true;
                                break;
                            }
                        }
                        if (!isExcluded) {
                            tempFiles.push(fileName);
                            this._outputChannel.appendLine("[ESP32 Micropython]:    - Added: " + fileName);
                        }
                    });
                    files = tempFiles;
                    
                    var dirExecute  = "";
                    dirs.forEach((dirPath, index, array) => {
                        dirExecute += "ampy --port " + uploadPort + " --baud " + uploadBaudRate + " mkdir " + dirPath;
                        if (index < array.length - 1) { dirExecute += " && "; }
                    });
                    this._outputChannel.appendLine("[ESP32 Micropython]: Creating directories...");
                    try { await this.newExecFromPromise(dirExecute); } catch (exception) {  }
                    
                    var fileExecute = "";
                    files.forEach((filePath, index, array) => {
                        fileExecute += "ampy --port " + uploadPort + " --baud " + uploadBaudRate + " put " + filePath + " " + filePath.substring(2, filePath.length);
                        if (index < array.length - 1) { fileExecute += " && "; }
                    });
                    this._outputChannel.appendLine("[ESP32 Micropython]: Pushing files...");
                    try { await this.newExecFromPromise(fileExecute); } catch (exception) {  }
                    vscode.window.showInformationMessage(files.length + " file" + (files.length > 1 ? "s" : "") + " has been pushed successfully!");
                    this._outputChannel.appendLine("[ESP32 Micropython]: All done!");
                } catch (exception) {
                    this._outputChannel.appendLine("\n[ESP32 Micropython]: Error while pushing files from project, please check the console for debug!");
                } finally {
                    this._status.text   = "ESP32: Done!";
                }
            });
        });
    }

    formatAllData() {
        return new Promise((resolve, reject) => {
            this._outputChannel.appendLine("[ESP32 Micropython]: Checking settings file...");
            this._outputChannel.show();
            vscode.workspace.openTextDocument(vscode.Uri.file(vscode.workspace.rootPath + '/micropy-config.json')).then(async (document: vscode.TextDocument) => {
                try {
                    let configObject    = JSON.parse(document.getText());
                    let uploadPort      = configObject['upload-port'];
                    let uploadBaudRate  = configObject['upload-baud'] || 115200;
                    this._outputChannel.appendLine("[ESP32 Micropython]: Using PORT: " + uploadPort);
                    this._outputChannel.appendLine("[ESP32 Micropython]: Using Baud: " + uploadBaudRate);
                    await this.newExecFromPromise("ampy --port " + uploadPort + " --baud " + uploadBaudRate + " rmdir /");
                } catch (exception) { } finally {
                    this._outputChannel.appendLine("[ESP32 Micropython]: All data formatted!");
                    resolve();
                }
            });
        });
    }

    displaySerialTerminal() {
        if (this._terminal) { this._terminal.dispose(); }
        if (!vscode.workspace.rootPath) { return; }
        vscode.workspace.openTextDocument(vscode.Uri.file(vscode.workspace.rootPath + '/micropy-config.json')).then((document: vscode.TextDocument) => {
            try {
                let configObject    = JSON.parse(document.getText());
                let uploadPort      = configObject['upload-port'];
                this._terminal = vscode.window.createTerminal("ESP32 Micropython");
                this._terminal.sendText("rshell --port " + uploadPort + " repl", true);
                this._terminal.show(false);
            } catch (exception) {
                
            }
        });
    }

    newExecFromPromise(command: string) {
        command = ("cd " + vscode.workspace.rootPath + " && " + command);
        return new Promise((resolve, reject) => {
            exec(command, (error: Error, stdout: any, stderr: any) => {
                if (error) { return reject(error); }
                resolve(stdout);
            });
        });
    }

}

export function activate(context: vscode.ExtensionContext) {
    let app = new ESP32Micropython();
    vscode.commands.registerCommand("extension.newProject", () => {
        app.createNewProject();
    });
    vscode.commands.registerCommand("extension.push", () => {
        app.pushActiveFile(false);
    });
    vscode.commands.registerCommand("extension.pushWithSerialMonitor", () => {
        app.pushActiveFile(true);
    });
    vscode.commands.registerCommand("extension.pushAll", () => {
        app.pushProject();
    });
    vscode.commands.registerCommand("extension.formatAll", async () => {
        await app.formatAllData();
    });
    vscode.commands.registerCommand("extension.showConsole", () => {
        app.displaySerialTerminal();
    });
    app.initial();
}

export function deactivate() {

}
