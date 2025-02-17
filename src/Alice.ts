import { DidCommMessageRecord, type ConnectionRecord, type CredentialExchangeRecord, type ProofExchangeRecord } from '@credo-ts/core'

import { BaseAgent } from './BaseAgent'
import { greenText, Output, redText } from './OutputClass'


export class Alice extends BaseAgent {
  public connected: boolean
  public connectionRecordSecurifyID?: string

  public constructor(port: number, name: string) {
    super({ port, name })
    this.connected = false
  }

  public static async build(): Promise<Alice> {
    const alice = new Alice(9002, 'Onur')
    await alice.initializeAgent()
    return alice
  }

  private async getConnectionRecord() {
    if (!this.connectionRecordSecurifyID) {
      throw Error(redText(Output.MissingConnectionRecord))
    }
    return await this.agent.connections.getById(this.connectionRecordSecurifyID)
  }

  private async receiveConnectionRequest(invitationUrl: string) {
    const { connectionRecord } = await this.agent.oob.receiveInvitationFromUrl(invitationUrl)
    // Throwing exception for invalid invitation URLs
    if (!connectionRecord) {
      throw new Error(redText(Output.NoConnectionRecordFromOutOfBand))
    }
    return connectionRecord
  }

  private async waitForConnection(connectionRecord: ConnectionRecord) {
    // Wait until the connection is fully established (DID exchanging operations under the hood etc.)
    connectionRecord = await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
    this.connected = true
    console.log(greenText(Output.ConnectionEstablished))
    return connectionRecord.id
  }

  public async acceptConnection(invitation_url: string) {
    const connectionRecord = await this.receiveConnectionRequest(invitation_url)
    this.connectionRecordSecurifyID = await this.waitForConnection(connectionRecord)
  }

  public async acceptCredentialOffer(credentialRecord: CredentialExchangeRecord) {
    await this.agent.credentials.acceptOffer({
      credentialRecordId: credentialRecord.id,
    })
  }

  public async acceptProofRequest(proofRecord: ProofExchangeRecord) {
    // Select credentials for the proof request
    const requestedCredentials = await this.agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRecord.id,
    });
  
    /*// Log requested attributes for proof
    const requestedAttributes = requestedCredentials.proofFormats.anoncreds?.attributes;
    console.log("\nRequested Credentials for Proof:");
  
    if (requestedAttributes) {
      for (const [attributeName, attributeInfo] of Object.entries(requestedAttributes)) {
        const credentialInfo = attributeInfo?.credentialInfo;
        if (credentialInfo && credentialInfo.attributes) {
          console.log(
            `  - Attribute Name: ${attributeName}, Credential Value: ${credentialInfo.attributes[attributeName]}`
          );
        } else {
          console.log(`  - Attribute Name: ${attributeName}, Credential Value: Not Available`);
        }
      }
    } else {
      console.log("  No attributes found in the proof request.");
    } */
  
    // Accept the proof request
    
    await this.agent.proofs.acceptRequest({
      proofRecordId: proofRecord.id,
      proofFormats: requestedCredentials.proofFormats,
    });
  
    console.log(greenText('\nProof request accepted!\n'));
  }
  
  

  /* public async acceptProofRequest(proofRecord: ProofExchangeRecord) {
    const requestedCredentials = await this.agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRecord.id,
    })

    console.log("requested Credentials: ", requestedCredentials.proofFormats.anoncreds?.attributes)
    await this.agent.proofs.acceptRequest({
      proofRecordId: proofRecord.id,
      proofFormats: requestedCredentials.proofFormats,
    })
    console.log(greenText('\nProof request accepted!\n'))
  }
 */
  public async sendMessage(message: string) {
    const connectionRecord = await this.getConnectionRecord()
    // sending text message
    await this.agent.basicMessages.sendMessage(connectionRecord.id, message)
  }

  public async exit() {
    console.log(Output.Exit)
    await this.agent.shutdown()
    process.exit(0)
  }

  public async restart() {
    await this.agent.shutdown()
  }

  // Method to list all credentials
  public async listCredentials(): Promise<CredentialExchangeRecord[]> {
    try {
      // Fetch all credentials stored in the agent
      const credentials = await this.agent.credentials.getAll();  // Assuming `getAll()` fetches all credentials

      // Sort credentials by `updatedAt` (if available) so that the latest updated credential comes last
      credentials.sort((a, b) => {
        // Assuming the `updatedAt` field exists and is a timestamp
        const aUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bUpdatedAt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return aUpdatedAt - bUpdatedAt; // Ascending order, latest updated credential comes last
      });


      return credentials;
    } catch (error) {
      console.error("Error fetching credentials:", error);
      return [];  // Return an empty array in case of error
    }
  }

  public async removeCredentialById(credentialId: string) {
    try {
      // Delete the credential by ID.
      await this.agent.credentials.deleteById(credentialId);
      console.log(greenText(`Credential with ID ${credentialId} removed successfully.`))
    } catch (error) {
      console.error(`Error deleting credential with ID ${credentialId}:`, error);
    }
  }
  
  
}
