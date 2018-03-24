# ESP32 Micropython for VSCode

ESP32 Micropython programming for VSCode.

## Features

- Generate simple project support Micropython platform.
- Handle project files on ESP32.
- Support debug terminal (Serial Monitor).

## Requirements

#### Python
If you do not have it already installed install Python by downloading from the [official site](https://www.python.org/downloads/). You can use python 2.x but I'm recommend using 3.x will better.

#### Pip
Pip is a installer for python modules that both downloads and installs the modules, if you are not already installed pip, please [click here](https://pip.pypa.io/en/stable/installing/#do-i-need-to-install-pip).

#### Ampy
Ampy allows you to interact with the file system created on the chip. This module is **required** for this extension. You can install ampy by *pip*:

```
pip install adafruit-ampy
```

#### rshell
Remote Shell for MicroPython. This module is **required** for this extension. You can install rshell by *pip3*:

```
sudo pip3 install rshell
```

That all! Just required **rshell** and **Ampy**!

## Extension Settings

This extension has no settings for this release.
You just press `⌘ + ⇧ + P` then type prefix `ESP32` to see tasks list:

- **ESP32:** Create new Project...
- **ESP32:** Push
- **ESP32:** Push & Debug
- **ESP32:** Push whole project
- **ESP32:** Format all data
- **ESP32:** Serial monitor


## Known Issues

This extension has been tested on MacOS. If you have any trouble with your OS. Please contact me soon by open issue or via email address: dinophan94@gmail.com. All requests appropriate!


## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.1

First release
