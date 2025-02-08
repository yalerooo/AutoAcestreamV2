# AutoAcestream

AutoAcestream is an Electron-based application designed to simplify watching Ace Stream content. It allows you to manage and play channels from M3U playlists directly in VLC Media Player. The application features a dynamic channel list, customizable image mappings, a built-in search bar, and user settings for VLC path and preferred channel list selection. It automatically saves window size and position. It also provides helpful links to download the required VLC and Ace Stream software.

## Project Structure

The project uses Node.js and npm (or yarn) to manage dependencies. The `node_modules` directory contains all the necessary libraries to run the project, but it is not included in the Git repository due to its large size. Instead, a `.gitignore` file is used to exclude it, and a `package.json` file is provided so users can easily install the dependencies.

```
SimpleAcePlayer/
├── src/
│   ├── css/
│   │   └── style.css
│   ├── html/
│   │   ├── index.html
│   │   └── settings.html
│   ├── main/
│   │   └── main.js
│   ├── preload/
│   │   └── preload.js
│   ├── renderer/
│   │   ├── renderer.js
│   │   └── settings.js
│   └── channels.json
├── package.json
├── package-lock.json (generated by npm)
└── default_channel_image.png
```

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Node.js**: Version 16.x or higher. You can download it from [here](https://nodejs.org/).
- **npm or yarn**: These package managers are included with Node.js or can be installed separately. npm is generally installed with Node.js.
- **Git**: To clone the repository. Download it from [here](https://git-scm.com/).
- **VLC Media Player**: You'll need VLC to play the Ace Stream content. Download it from [here](https://www.videolan.org/vlc/index.es.html).
- **Ace Stream Media**: This is required to handle the Ace Stream links. Download it from [here](https://download.acestream.media/products/acestream-full/win/latest).

## Project Setup

### 1. Clone the Repository

Clone this repository to your local machine using the following command:

```bash
git clone https://github.com/yalerooo/AutoAcestreamV2.git
cd AutoAcestreamV2
```

Replace `https://github.com/yalerooo/AutoAcestreamV2.git` with the actual URL of your repository.

### 2. Install Dependencies

The `package.json` file contains a list of all dependencies required for the project. To install them, run one of the following commands:

Using npm:
```bash
npm install
```

Using yarn:
```bash
yarn install
```

This will create the `node_modules` directory in your project, where all necessary libraries, including Electron, will be stored.

### 3. Install Electron (Explicit Instruction)

Although Electron should be installed as part of the general dependencies in step 2, it's good practice to explicitly mention how to install it, in case users encounter issues or want to install a specific version.

Using npm:
```bash
npm install --save-dev electron
```

Using Yarn:
```bash
yarn add --dev electron
```

The `--save-dev` (or `-D` with yarn) flag installs Electron as a development dependency.

### 4. Run the Project

Once the dependencies are installed, you can start the project with the following commands:

Using npm:
```bash
npm start
```

Using yarn:
```bash
yarn start
```

This will start the Electron application in your local environment.

### 5. First Run & Adding Channel Sources

On the first run, the application will have an empty channel list. You'll need to add channel sources through the "Settings" menu:

1. Click the "Settings" button.
2. Click the "Add Source" button.
3. Enter a name for the channel source (e.g., "My List").
4. Enter the full URL of the M3U playlist (e.g., `https://example.com/myplaylist.m3u`).
5. Click "Add".
6. Select a source and click on "Save".

You can add multiple sources. The selected source will be used to load the channel list.

## Key Features and Considerations

- **Clear Introduction:** Explains the purpose of the application.
- **Prerequisites:** Includes VLC and Ace Stream, with links to their official download pages.
- **Explicit Electron Installation:** Includes a separate section on installing Electron, even though it's technically a dependency.
- **First Run Instructions:** Guides the user through adding sources via the settings.
- **Complete and Correct Commands:** Provides the correct commands for both `npm` and `yarn`.
- **Project Structure:** Includes a basic project structure.
- **Replace URL:** Tells the user to change the URL of the `git clone` command.



