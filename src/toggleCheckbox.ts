import * as vscode from 'vscode';
import { Position, Range, TextEditorEdit } from 'vscode';
import * as helpers from './helpers';

/** Mark a checkbox as checked or unchecked */
export const toggleCheckbox = async () => {
    // the position object gives you the line and character where the cursor is
    const editor = helpers.getEditor();
    if (editor.selection.isEmpty) {
        const cursorPosition = helpers.getCursorPosition();
        const line = editor.document.lineAt(cursorPosition.line);
        await toggleCheckboxOfLine(line);
        const endLine = editor.document.lineAt(editor.selection.end.line);
        const selectionPosition = new vscode.Position(endLine.lineNumber, 20000);
        helpers.getEditor().selection = new vscode.Selection(selectionPosition, selectionPosition);
    } else {
        const selection = editor.selection;

        // get all line numbers of the selection
        for (let r = selection.start.line; r <= selection.end.line; r++) {
            const line = editor.document.lineAt(r);
            await toggleCheckboxOfLine(line);
        }
    }
};

/** mark or unmark the checkbox of a given line in the editor */
export const toggleCheckboxOfLine = (line: vscode.TextLine, checkIt?: boolean) => {
    const lhc = helpers.getCheckboxOfLine(line);

    // no edit action required
    if (!lhc || !lhc.checked && checkIt === false || lhc.checked === true && checkIt === true) {
        return Promise.resolve(undefined);
    }

    let value = ' ';

    // if the checkbox is not checked or it must be checked
    if (checkIt === true || checkIt === undefined && !lhc.checked) {
        value = helpers.getConfig<string>('checkmark');
    }

    return markField(lhc.position, value);
};

/** Marks the field inside the checkbox with a character */
const markField = (checkboxPosition: Position, replacement: string): Thenable<boolean> => {
    const editor = helpers.getEditor();
    const checkmark = helpers.getConfig<string>('checkmark');

    return editor.edit((editBuilder: TextEditorEdit) => {
        editBuilder.replace(new Range(
            new Position(checkboxPosition.line, checkboxPosition.character + 1),
            new Position(checkboxPosition.line, checkboxPosition.character + (replacement !== ' ' ? 2 : checkmark.length + 1))
        ), replacement);

        // get settings from config
        const italicWhenChecked = helpers.getConfig<boolean>('italicWhenChecked');
        const strikeThroughWhenChecked = helpers.getConfig<boolean>('strikeThroughWhenChecked');
        const dateWhenChecked = helpers.getConfig<boolean>('dateWhenChecked');

        // get line of the checkbox
        const line = editor.document.lineAt(checkboxPosition.line);
        const lhc = helpers.getCheckboxOfLine(line);
        const lineText = line.text;
        const textWithoutCheckbox = lineText.substr(checkboxPosition.character + 4, lineText.length).trim();

        // respect trailing whitespace
        const foundTrailingWhitespace = lineText.substr(checkboxPosition.character + 4, lineText.length).match(/[\s\n\r]*$/);
        const whitespace = foundTrailingWhitespace ? foundTrailingWhitespace.join('') : '';

        if (!lhc.checked && textWithoutCheckbox.length > 0) {
            let newText = (strikeThroughWhenChecked ? '~~' : '') + (italicWhenChecked ? '*' : '') + textWithoutCheckbox + (italicWhenChecked ? '*' : '') + (strikeThroughWhenChecked ? '~~' : '');
            // add the date string
            newText = newText + (dateWhenChecked ? ' [' + helpers.getDateString(new Date()) + ']' : '') + whitespace;

            editBuilder.replace(new Range(
                new Position(checkboxPosition.line, checkboxPosition.character + 4),
                new Position(checkboxPosition.line, line.text.length)
            ), newText);
        }
        else if (lhc.checked) {
            let newText = textWithoutCheckbox.replace(/~~/g, '').replace(/\*/g, '');
            // remove the date string
            newText = newText.replace(/\s+\[\d{4}[\-]\d{2}[\-]\d{2}\]\s*/, '') + whitespace;

            editBuilder.replace(new Range(
                new Position(checkboxPosition.line, checkboxPosition.character + 4),
                new Position(checkboxPosition.line, line.text.length)
            ), newText);
        }
    });
};
