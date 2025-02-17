import type { Alice } from './Alice'
import type { AliceInquirer } from './AliceInquirer'
import type { Faber } from './Faber'
import type { FaberInquirer } from './FaberInquirer'
import type {
  Agent,
  BasicMessageStateChangedEvent,
  CredentialExchangeRecord,
  CredentialStateChangedEvent,
  ProofExchangeRecord,
  ProofStateChangedEvent,
} from '@credo-ts/core'
import type BottomBar from 'inquirer/lib/ui/bottom-bar'
import { EventEmitter } from 'events';

import {
  BasicMessageEventTypes,
  BasicMessageRole,
  CredentialEventTypes,
  CredentialState,
  ProofEventTypes,
  ProofState,
} from '@credo-ts/core'
import { ui } from 'inquirer'

import { Color, purpleText } from './OutputClass'

export class Listener {
  public on: boolean
  private ui: BottomBar

  public constructor() {
    this.on = false
    this.ui = new ui.BottomBar()
  }

  private turnListenerOn() {
    this.on = true
  }

  private turnListenerOff() {
    this.on = false
  }

  private printCredentialAttributes(credentialRecord: CredentialExchangeRecord) {
    //console.log("\nCredential Exchange Record: ", credentialRecord)
    if (credentialRecord.credentialAttributes) {
      const attribute = credentialRecord.credentialAttributes
      console.log('\n\nCredential preview:')
      attribute.forEach((element) => {
        console.log(purpleText(`${element.name} ${Color.Reset}${element.value}`))
      })
    }
  }

  private async newCredentialPrompt(credentialRecord: CredentialExchangeRecord, aliceInquirer: AliceInquirer) {
    this.printCredentialAttributes(credentialRecord)
    this.turnListenerOn()
    await aliceInquirer.acceptCredentialOffer(credentialRecord)
    this.turnListenerOff()
    await aliceInquirer.processAnswer()
  }

  public credentialOfferListener(alice: Alice, aliceInquirer: AliceInquirer) {
    alice.agent.events.on(
      CredentialEventTypes.CredentialStateChanged,
      async ({ payload }: CredentialStateChangedEvent) => {
        if (payload.credentialRecord.state === CredentialState.OfferReceived) {
          await this.newCredentialPrompt(payload.credentialRecord, aliceInquirer)
        }
      }
    )
  }

  public messageListener(agent: Agent, name: string) {
    agent.events.on(BasicMessageEventTypes.BasicMessageStateChanged, async (event: BasicMessageStateChangedEvent) => {
      if (event.payload.basicMessageRecord.role === BasicMessageRole.Receiver) {
        this.ui.updateBottomBar(purpleText(`\n${name} received a message: ${event.payload.message.content}\n`))
      }
    })
  }

  private async newProofRequestPrompt(proofRecord: ProofExchangeRecord, aliceInquirer: AliceInquirer) {
    this.turnListenerOn()
    await aliceInquirer.acceptProofRequest(proofRecord)
    this.turnListenerOff()
    await aliceInquirer.processAnswer()
  }

  public proofRequestListener(alice: Alice, aliceInquirer: AliceInquirer) {
    alice.agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.RequestReceived) {
        await this.newProofRequestPrompt(payload.proofRecord, aliceInquirer)
      }
    })
  }

  /* public proofAcceptedListener(faber: Faber, faberInquirer: FaberInquirer) {
    faber.agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.Done) {
        await faberInquirer.processAnswer()
      }
    })
  } */

  /* public proofAcceptedListener(faber: Faber, faberInquirer: FaberInquirer) {
    
      faber.agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
        if (payload.proofRecord.state === ProofState.Done) {
          const isVerified = payload.proofRecord.isVerified;
          
          // Check the verification status and print the appropriate message
          if (isVerified) {
            console.log(purpleText('\nThe proof request has been successfully verified!\n'));
          } else {
            console.log(purpleText('\nThe proof request could not be verified.\n'));
          } 
    
          // Process the next step (if needed)
          //await faberInquirer.processAnswer();
        }
      });
  } */

  public proofAcceptedListener(faber: Faber, faberInquirer: FaberInquirer) {
    const listener = async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.Done) {
        const isVerified = payload.proofRecord.isVerified;

        if (isVerified) {
          console.log(purpleText('\nThe proof request has been successfully verified!\n'));
        } else {
          console.log(purpleText('\nThe proof request could not be verified.\n'));
        }

        // Process next steps if necessary (for example)
        // await faberInquirer.processAnswer();

        // Remove the listener after processing the event
      }
    };
    faber.agent.events.on(ProofEventTypes.ProofStateChanged, listener);
  }



  public async newAcceptedPrompt(title: string, faberInquirer: FaberInquirer) {
    this.turnListenerOn()
    await faberInquirer.exitUseCase(title)
    this.turnListenerOff()
    await faberInquirer.processAnswer()
  }
}
