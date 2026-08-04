# Build Instructions for Mozilla Reviewers

This extension is built from vanilla JavaScript modules using a simple Node.js script. 
No transpilers (like Babel or Webpack) are used. The build script concatenates the source files and minifies them using `terser`.

## Requirements
- **Operating System:** Any OS that supports Node.js (Windows, macOS, Linux)
- **Node.js:** v20.x or higher (Download from https://nodejs.org/en/download/)
- **npm:** v10.x or higher (Included with Node.js)

## Step-by-step Build Instructions

1. Ensure Node.js and npm are installed on your system.
2. Open a terminal and navigate to this source code directory.
3. Run `npm install` to install the `terser` minifier dependency defined in `package.json`.
4. Run `node build.js`.
5. The build script will read the raw source files from the `src/` directory, concatenate them, run them through `terser`, and output the exact `dynamic-island-extension-v1.5.zip` file submitted for review.
