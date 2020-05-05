import * as vscode from 'vscode'
import * as path from 'path'
import * as replaceInFile from 'replace-in-file'
import * as fs from 'fs'

function createInput(): Thenable<string | undefined> {

	var options: vscode.InputBoxOptions = {
		ignoreFocusOut: false,
		placeHolder: "New header name ...",
		prompt: "Type a new header name"
	}
	return vscode.window.showInputBox(options)
}

function showInfoMsg(msg: string) {
	vscode.window.showInformationMessage(msg)
}

function showErrorMsg(msg: string) {
	vscode.window.showErrorMessage(msg)
}

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('cpp-file-renamer.renameCppFile', (context) => {

		if (context == undefined)
			return

		let filePath = path.normalize(context.fsPath)
		let dirArray = filePath.split(path.sep)
		let srcFolderIndex = dirArray.indexOf("src")
		if (srcFolderIndex == -1) {
			showErrorMsg("Cannot rename C++ file: No \"src\" parent directory")
			return
		}
		let preSrcDirArray: string[] = []
		for (let i = 0; i < srcFolderIndex; i++) {
			preSrcDirArray.push(dirArray[i])
		}

		createInput().then(input => {

			if (input == undefined)
				return

			let preSrcPath = preSrcDirArray.join(path.sep)
			let fileName = path.basename(filePath)
			let fileNameNoExt = fileName.replace(/\..*/, "")
			let fileExtension = path.extname(filePath)

			let newFilename = `${input}${fileExtension}`
			let newFilePath = `${path.dirname(filePath)}${path.sep}${newFilename}`

			// If this is a header file
			if (fileExtension == ".h" || fileExtension == ".hpp") {

				// Update header guard
				let headerGuardMacroSuffix = `_${fileExtension.replace(".", "").toUpperCase()}`
				let headerGuardMacro = `${fileNameNoExt.toUpperCase()}${headerGuardMacroSuffix}`
				let newHeaderGuardMacro = `${input.toUpperCase()}${headerGuardMacroSuffix}`
				let regexp = new RegExp(headerGuardMacro, "g")
				replaceInFile.sync({
					files: filePath,
					from: regexp,
					to: newHeaderGuardMacro
				})

				// If corresponding .cpp file exists, rename it
				let fileDir = path.dirname(filePath)
				let cppFilePath = fileDir + path.sep + fileNameNoExt + ".cpp"
				if (fs.existsSync(cppFilePath)) {
					let newCppFilePath = fileDir + path.sep + input + ".cpp"
					fs.renameSync(cppFilePath, newCppFilePath)
				}
			}

			// Rename file
			fs.renameSync(filePath, newFilePath)

			// Update all references in files under "src/"
			replaceInFile.sync({
				files: `${preSrcPath}/src/**`,
				from: fileName,
				to: newFilename
			})
		})
	})

	context.subscriptions.push(disposable)
}

export function deactivate() { }
