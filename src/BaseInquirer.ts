import { prompt } from 'inquirer'

import { redText, Title } from './OutputClass'

export enum ConfirmOptions {
  Yes = 'YES',
  No = 'NO',
}

export class BaseInquirer {
  public optionsInquirer: { type: string; prefix: string; name: string; message: string; choices: string[] }
  public inputInquirer: { type: string; prefix: string; name: string; message: string; choices: string[] }

  public constructor() {
    this.optionsInquirer = {
      type: 'list',
      prefix: '',
      name: 'options',
      message: '',
      choices: [],
    }

    this.inputInquirer = {
      type: 'input',
      prefix: '',
      name: 'input',
      message: '',
      choices: [],
    }
  }

  public inquireOptions(promptOptions: string[]) {
    this.optionsInquirer.message = Title.OptionsTitle
    this.optionsInquirer.choices = promptOptions
    return this.optionsInquirer
  }

  public inquireInput(title: string) {
    this.inputInquirer.message = title
    return this.inputInquirer
  }

  public inquireConfirmation(title: string) {
    this.optionsInquirer.message = title
    this.optionsInquirer.choices = [ConfirmOptions.Yes, ConfirmOptions.No]
    return this.optionsInquirer
  }

  public async inquireMessage() {
    this.inputInquirer.message = Title.MessageTitle
    const message = await prompt([this.inputInquirer])

    return message.input[0] === 'q' ? null : message.input
  }

  // New method to inquire credential ID
  public async inquireCredentialId() {
    this.inputInquirer.message = 'Please enter the credential ID to proceed with removal:'
    const credentialIdResponse = await prompt([this.inputInquirer])

    const credentialId = credentialIdResponse.input
    if (!credentialId) {
      console.log(redText('Credential ID cannot be empty!'))
      return null
    }

    return credentialId
  }
}
