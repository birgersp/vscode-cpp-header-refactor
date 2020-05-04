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
			let fileExtension = path.extname(filePath)

			let newFilename = `${input}${fileExtension}`
			let newFilePath = `${path.dirname(filePath)}${path.sep}${newFilename}`

			fs.renameSync(filePath, newFilePath)

			replaceInFile.sync({
				files: `${preSrcPath}/src/**`,
				from: `${path.basename(filePath)}`,
				to: `${newFilename}`
			})
		})
	})

	context.subscriptions.push(disposable)
}

export function deactivate() { }
