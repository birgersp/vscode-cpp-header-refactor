import * as vscode from 'vscode'
import * as path from 'path'
import * as replaceInFile from 'replace-in-file'
import * as fs from 'fs'

function createInput(filename: string): Thenable<string | undefined> {

	var options: vscode.InputBoxOptions = {
		ignoreFocusOut: false,
		placeHolder: "New header name ...",
		prompt: "Type a new header name",
		value: filename
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

	let disposable = vscode.commands.registerCommand('cpp-header-refactor.renameCppHeader', (context) => {

		if (context == undefined)
			return

		let filePath = context.fsPath
		let fileExtension = path.extname(filePath)

		// If not a header file
		if (fileExtension != ".h" && fileExtension != ".hpp") {
			showErrorMsg("Cannot rename: Header files (.h or .hpp) only")
			return
		}

		let fileName = path.basename(filePath)
		let fileNameNoExt = fileName.replace(path.extname(filePath), "")
		
		createInput(fileNameNoExt).then(input => {

			if (input == undefined)
				return

			let newFilename = `${input}${fileExtension}`
			let newFilePath = `${path.dirname(filePath)}${path.sep}${newFilename}`

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

			// Determine sub-directory (e.g. "include/myfolder/")
			let srcDir: string
			let fileDir = path.dirname(filePath)
			let includeDir = vscode.workspace.rootPath + path.sep + "include"
			if (includeDir == fileDir) {
				srcDir = vscode.workspace.rootPath + path.sep + "src"
			} else {
				let substitution = path.normalize(includeDir + path.sep)
				let subdir = path.normalize(fileDir).replace(substitution, "")
				srcDir = vscode.workspace.rootPath + path.sep + "src" + path.sep + subdir
			}

			// If corresponding .cpp file exists, rename it
			let cppFilePath = srcDir + path.sep + fileNameNoExt + ".cpp"
			if (fs.existsSync(cppFilePath)) {
				let newCppFilePath = srcDir + path.sep + input + ".cpp"
				fs.renameSync(cppFilePath, newCppFilePath)
			}

			// Rename file
			fs.renameSync(filePath, newFilePath)

			// Update all references in files under "src/"
			replaceInFile.sync({
				files: `${vscode.workspace.rootPath}/src/**`,
				from: new RegExp(fileName, "g"),
				to: newFilename
			})

			// Update all references in files under "include/"
			replaceInFile.sync({
				files: `${vscode.workspace.rootPath}/include/**`,
				from: new RegExp(fileName, "g"),
				to: newFilename
			})
		})
	})

	context.subscriptions.push(disposable)
}

export function deactivate() { }
