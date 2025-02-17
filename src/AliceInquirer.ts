import type { CredentialExchangeRecord, ProofExchangeRecord } from '@credo-ts/core'

import { clear } from 'console'
import { textSync } from 'figlet'
import { prompt } from 'inquirer'

import { Alice } from './Alice'
import { BaseInquirer, ConfirmOptions } from './BaseInquirer'
import { Listener } from './Listener'
import { purpleText, redText, yellowText, Title, greenText } from './OutputClass'

import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 20;

// Holder driver function
export const runHolder = async () => {
  // Clear the console
  clear()
  console.log(textSync('Holder', { horizontalLayout: 'full' }))
  const alice = await AliceInquirer.build()
  await alice.processAnswer()
}

enum PromptOptions {
  ReceiveConnectionUrl = 'Receive connection invitation',
  SendMessage = 'Send message',
  ListAllCredentials = 'ListAllCredentials',
  RemoveCredentialByID = 'RemoveCredentialByID',
  RemoveAllCredentials = 'RemoveAllCredentials',
  Restart = 'Restart',
  Exit = 'Exit'
}

export class AliceInquirer extends BaseInquirer {
  public alice: Alice
  public promptOptionsString: string[]
  public listener: Listener

  public constructor(alice: Alice) {
    super()
    this.alice = alice
    this.listener = new Listener()
    this.promptOptionsString = Object.values(PromptOptions)
    this.listener.messageListener(this.alice.agent, this.alice.name)
  }

  public static async build(): Promise<AliceInquirer> {
    const alice = await Alice.build()
    return new AliceInquirer(alice)
  }

  private async getPromptChoice() {
    // When connected, print advanced prompt options
    if (this.alice.connectionRecordSecurifyID){
     return prompt([this.inquireOptions(this.promptOptionsString)])
    }
      
    // when no connection, print minimal prompt options
    const reducedOption = [PromptOptions.ReceiveConnectionUrl, PromptOptions.ListAllCredentials, PromptOptions.RemoveCredentialByID, PromptOptions.RemoveAllCredentials, PromptOptions.Restart, PromptOptions.Exit]
    return prompt([this.inquireOptions(reducedOption)])
  }

  public async processAnswer() {
    // Get user's choice
    const choice = await this.getPromptChoice()

    // If there is an ongoing event handling, then do not ask for a new event.
    if (this.listener.on) return

    // No ongoing event, then ask for a new event
    switch (choice.options) {
      case PromptOptions.ReceiveConnectionUrl:
        await this.connection()
        break
      case PromptOptions.SendMessage:
        await this.message()
        break
      case PromptOptions.Exit:
        await this.exit()
        break
      case PromptOptions.Restart:
        await this.restart()
        return
      case PromptOptions.ListAllCredentials:
        await this.listAllCredentials()
        break
      case PromptOptions.RemoveCredentialByID:
        await this.removeCredential()
        break
      case PromptOptions.RemoveAllCredentials:
        await this.removeAllCredentials()
        break
    }
    // infinite loop until exit is selected
    await this.processAnswer()
  }


  public async acceptCredentialOffer(credentialRecord: CredentialExchangeRecord) {
    const confirm = await prompt([this.inquireConfirmation(Title.CredentialOfferTitle)])
    if (confirm.options === ConfirmOptions.No) {
      await this.alice.agent.credentials.declineOffer(credentialRecord.id)
    } else if (confirm.options === ConfirmOptions.Yes) {
      await this.alice.acceptCredentialOffer(credentialRecord)
    }
  }

  public async acceptProofRequest(proofRecord: ProofExchangeRecord) {
    try {
      
      //display proof request content
      const requestedCredentials = await this.alice.agent.proofs.selectCredentialsForRequest({
        proofRecordId: proofRecord.id,
      });
    
      const requestedAttributes = requestedCredentials.proofFormats.anoncreds?.attributes;
      console.log(purpleText("\nRequested Attributes for Proof listed below:\n"));
    
      if (requestedAttributes) {
        for (const [attributeName, attributeInfo] of Object.entries(requestedAttributes)) {
          const credentialInfo = attributeInfo?.credentialInfo;
          if (credentialInfo && credentialInfo.attributes) {
            console.log(yellowText(`  - Attribute Name: ${attributeName}, Credential Value: ${credentialInfo.attributes[attributeName]}`));
          } else {
            console.log(yellowText(`  - Attribute Name: ${attributeName}, Credential Value: Not Available`));
          }
        }
      } else {
        console.log(redText("  No attributes found in the proof request."));
      }
      /////


      const confirm = await prompt([this.inquireConfirmation(Title.ProofRequestTitle)])
      if (confirm.options === ConfirmOptions.No) {
        await this.alice.agent.proofs.declineRequest({ proofRecordId: proofRecord.id })
      } else if (confirm.options === ConfirmOptions.Yes) {
        await this.alice.acceptProofRequest(proofRecord)
      }

    } 
    catch (error) {
      console.log(redText("\nCredential could not be fetched from the wallet!\n"))
    }
  }

  public async connection() {
    const title = Title.InvitationTitle
    // Ask the user to paste the invitation URL
    const getUrl = await prompt([this.inquireInput(title)])
    // Accept issuer's invitation as a holder
    await this.alice.acceptConnection(getUrl.input)
    if (!this.alice.connected) return

    // Set credential offer and proof request listeners on
    this.listener.credentialOfferListener(this.alice, this)
    this.listener.proofRequestListener(this.alice, this)
  }

  public async message() {
    const message = await this.inquireMessage()
    if (!message) return
    // Send plain text message to Issuer
    await this.alice.sendMessage(message)
  }

  public async exit() {
    const confirm = await prompt([this.inquireConfirmation(Title.ConfirmTitle)])
    if (confirm.options === ConfirmOptions.No) {
      return
    } else if (confirm.options === ConfirmOptions.Yes) {
      await this.alice.exit() // Shut down the agent
    }
  }

  public async restart() {
    const confirm = await prompt([this.inquireConfirmation(Title.ConfirmTitle)])
    if (confirm.options === ConfirmOptions.No) {
      await this.processAnswer()
      return;
    } else if (confirm.options === ConfirmOptions.Yes){ // Restart the agent
      await this.alice.restart()
      await runHolder()
    }
  }


  public async listAllCredentials() {
    try {
      // Get all credentials
      const credentials = await this.alice.listCredentials() // Correct method to get credentials
  
      console.log("\nList of All Credentials:");
  
      // Check if credentials are available
      if (credentials.length > 0) {
        credentials.forEach((credentialRecord, index) => {
          console.log(greenText(`\nCredential Exchange Record ${index + 1}:`));
          console.log(purpleText(`  - Credential Record ID: ${credentialRecord.id}`));
          if (credentialRecord.credentialAttributes) {
            credentialRecord.credentialAttributes.forEach((attribute) => {
              console.log(yellowText(`  - ${attribute.name}: ${attribute.value}`));
            });
          } else {
            console.log(redText("  - No attributes found in this credential exchange record."));
          }
        });
      } else {
        console.log(redText("No credentials found."));
      }
    } catch (error) {
      console.error("Error listing credentials:", error);
    }
  }

  public async removeCredential() {
    const credentialId = await this.inquireCredentialId()

    if (credentialId) {
      // Perform the action to remove the credential using the ID
      await this.alice.removeCredentialById(credentialId)
    } else {
      console.log(redText('No credential ID provided. Action cancelled.'))
    }
  }

  public async removeAllCredentials() {
    try {
      // Get all credentials
      const credentials = await this.alice.listCredentials()
  
      if (credentials.length === 0) {
        console.log(yellowText("No credentials available to remove."))
        return
      }
  
      // Iterate through all credentials and remove them one by one
      for (const credential of credentials) {
        await this.alice.removeCredentialById(credential.id)
      }
      
      console.log(purpleText("All credentials removed."))
    } catch (error) {
      console.error("Error removing credentials:", error)
    }
  }
}

void runHolder()
