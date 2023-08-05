const express = require('express');
const readline = require('readline');
const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
const path = require('path');
const fs = require('fs');
const netClient = require("net").Socket(); // Required for user registration

app = express();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Allows self-signed certificates


// The main XMPP client class
class Client_XMPP {
    constructor(username, password, service = "xmpp://alumchat.xyz:5222", domain = "alumchat.xyz") {
        //General info about server and client 
        this.username = username;
        this.password = password;
        this.service = service;
        this.domain = domain;

        //Client info
        this.xmpp = null;
        this.loginState = false;
        
        // User specific messaging and subscription info
        this.messages = [];
        this.receivedSubscriptions = [];
        this.receivedGroupChatInvites = [];
    }


    //Main Menu
    showMenu = async() => {
        const rl = readline.createInterface({
            input : process.stdin,
            output : process.stdout
        });

        console.log(`\nCurrent User: ${this.username}`);
        console.log('\nMenu:');
        console.log('1. Send Message'); 
        console.log('2. Delete account from server'); 
        console.log('3. Show contacts and their info');
        console.log('4. Add users as contacts'); 
        console.log('5. Show details of a user'); 
        console.log('6. Group chatting'); 
        console.log('7. Set presence message');
        console.log('8. Send/Receive files'); 

        //Account administration
        console.log('9. Close Session'); // Exit

        //Menu options
        rl.question('Select an option: ', async(answer) => {
            switch(answer) {
                case '1': // Send message
                    rl.question('Enter the user you want to send the message to: ', (user) => {
                        rl.question('Enter the message you want to send: ', async(message) => {
                            await this.sendMessage(user, message);
                            rl.close();
                            await this.showMenu();
                        });
                    });
                    break;
                case '2': // Delete account
                    rl.question("Are you sure about this? (y/n): ", async(choice) => {
                        if(choice == 'y') {
                            console.log("Deleting account...");
                            await this.deleteAccount();
                            rl.close();
                            loginMenu();
                        } else {
                            rl.close();
                            await this.showMenu();
                        }
                    });
                    break;
                case '3': // Show all contacts and their status
                    await this.mostrarUsuarios();
                    await this.showMenu();
                    break;
                case '4': // Add user to contacts
                    
                    console.log("1. Agregar usuario a contactos");
                    console.log("2. Aceptar solicitudes pendientes");
                
                    rl.question("Choose your option: ", async(answer) => {

                        switch (answer) {
                            case '1': // Add user to contacts
                                rl.question("Enter the user you want to add: ", async(user) => {
                                    await this.addContacts(user);
                                    console.log("Request sent");
                                    rl.close();
                                    await this.showMenu();
                                });
                                break;
                            case '2': // Accept pending requests
                                if(this.receivedSubscriptions.length == 0) {
                                    console.log("No pending requests");
                                    await this.showMenu();
                                } else {
                                    console.log("Here are your pending requests: ");
                                    this.receivedSubscriptions.forEach((request) => {
                                        console.log("- " + request.split('@')[0]);
                                    });
                                    rl.question("Enter the user you want to accept: ", async(user) => {
                                        const presence = xml("presence", {type: "subscribed", to: user + "@alumchat.xyz"});
                                        await this.xmpp.send(presence);
                                        console.log("Request accepted");
                                        this.receivedSubscriptions.splice(this.receivedSubscriptions.indexOf(user), 1);
                                        rl.close();
                                        await this.showMenu();
                                    });
                                }
                                break;
                            default:
                                console.log("Invalid option");
                                rl.close();
                                await this.showMenu();
                                break;
                        };
                    });
                    break;
                case '5': // Show user details
                    rl.question("Enter the user you want to see the details of: ", async(user) => {
                        await this.showUserDetails(user);
                        rl.close();
                    });
                    break;
                case '6': // Group conversation
                    console.log("1. Create group chat");
                    console.log("2. Join group chat (From Invites)");

                    rl.question("Choose your option: ", async(answer) => {
                        switch(answer) {
                            case '1': // Create group chat
                                rl.question("Enter the name of the group chat: ", async(groupchat) => {
                                    this.createGC(groupchat);
                                    rl.close();
                                });
                                break;
                            case '2': // Join group chat
                                if(this.receivedGroupChatInvites.length == 0) {
                                    console.log("No pending invitations");
                                } else {
                                    console.log("Here are your pending invitations: ");
                                    this.receivedGroupChatInvites.forEach((invitation) => {
                                        console.log("- " + invitation.split('@')[0]);
                                    });
                                }

                                rl.question("Enter the group chat you want to join: ", async(groupchat) => {
                                    this.createGC(groupchat);
                                });
                                break;
                            case '4': // Invite to group chat
                                
                                break;
                            default:
                                console.log("Invalid option");
                                rl.close();
                                await this.showMenu();
                                break;
                        };
                    });
                    break;
                case '7': // Set presence message
                    rl.question("Enter your presence state: ", async(presenceState) => {
                        rl.question("Enter your presence message: ", async(message) => {
                            await this.setPresenceMessage(presenceState, message);
                            rl.close();
                        });
                    });
                    break;
                case '8': // Send/Receive files
                    
                    rl.question("Enter the user you want to send the file to: ", async(user) => {
                        rl.question("Enter the path of the file you want to send: ", async(file) => {
                            await this.sendFile(user, file);
                            rl.close();
                            await this.showMenu();
                        });
                    });
                    break; 

                case '9':
                    console.log("Exiting...");
                    const disconnect = async() => {
                        await this.xmpp.send(xml("presence", {type: "unavailable"}))
                        await this.xmpp.stop();
                        rl.close();
                    }
                    loginMenu();
                    break;
                default:
                    console.log('Invalid option');
                    rl.close();
                    await this.showMenu();
                    break;
            };
        });

    };


    // Will delete the account from the server
    async deleteAccount() {
        const deleteRequest = xml("iq", {type: "set", id: "unreg1"}, xml("query", {xmlns: "jabber:iq:register"}, xml("remove", {})));
        this.xmpp.send(deleteRequest).then(() => {
            console.log("Account deleted succesfully");
            this.xmpp.stop();
        }).catch((err) => {
            console.error("Error when deleting account: ", err);
        });
    }

    // Will connect the client to the server, and will handle the different notifications and messages
    async connect() {
        this.xmpp = client({
            service: this.service,
            domain: this.domain,
            username: this.username,
            password: this.password,
            terminal: true,
            tls: {
                rejectUnauthorized: false
            },
        });

        this.xmpp.on("error", (err) => {
            if(err.condition == "not-authorized") {
                console.error("Error while logging in");
            };
        });

        //Sets state as online
        this.xmpp.on("online", async () => {
            await this.xmpp.send(xml("presence", {type: "online"}));


            // Handles the different notifications and messages
            this.xmpp.on("stanza", (stanza) => {
                if(stanza.is('message') && stanza.attrs.type == 'chat') {// Handles incoming chat 1 on 1 messaging
                    const from = stanza.attrs.from;
                    const body = stanza.getChildText("body");
                    const message = {from, body};

                    if (body) {
                        console.log(`Received message from ${from.split('@')[0]}:`, body);
                    }
                }

                else if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
                    const from = stanza.attrs.from;
                    this.receivedSubscriptions.push(from);
                    console.log("Received subscription request from:", from.split('@')[0]);
                    console.log("Request message:", stanza.getChildText("status"));
                }
                
                else if (stanza.is('message') && stanza.attrs.from.includes('@conference.alumchat.xyz')) {
                    const groupchat = stanza.attrs.from
                    const to = stanza.attrs.to                    
            
                    this.receivedGroupChatInvites.push(groupchat)
            
                    // Si el to no tiene una diagonal, entonces se imprime la invitación.
                    if (!to.includes('/')) {
                      console.log("Group chat invitation from: ", groupchat)
                    }
                }
                
            });

        });

        await this.xmpp.start().then(()=> {this.loginState = true}).catch((err) => {
            if(err.condition == "not-authorized") {
                console.error("This user may not exist in the server. Please try again.");
            };
        });
    };

    // Adds contacts to the user's contact list by requesting subscription
    async addContacts(jid) {

        const presence = xml("presence", {type: "subscribe", to: jid + "@alumchat.xyz"});
        this.xmpp.send(presence).then(() => {
            console.log("Contact request sent to: ", jid);
            this.showMenu();
        }).catch((err) => {
            console.error("Error when adding contact: ", err);
        });
    };

    // Handles the file sending to a url - WIP
    async sendFile(sendTo, filePath) {

        const user = sendTo + "@alumchat.xyz";
        
        const file = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const base64File = file.toString('base64');

        const message = xml("message", {type: 'chat', to: user}, xml("body", {}, ' File: ' +fileName + ' content: ' + base64File));
        await this.xmpp.send(message);

        console.log("File sent succesfully");
    };

    async sendFileGC(sendTo, filePath) {

        const user = sendTo
        
        const file = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const base64File = file.toString('base64');

        const message = xml("message", {type: 'groupchat', to: user}, xml("body", {}, ' File: ' +fileName + ' content: ' + base64File));
        await this.xmpp.send(message);

        console.log("File sent succesfully");

    };


    // Handles de creation and joining of group chats
    async createGC(roomName) {
        const roomId = roomName + "@conference.alumchat.xyz";

        // If group chat is not found in the server, it will be created
        await this.xmpp.send(xml("presence", {to: roomId + "/" + this.username}));
        console.log("Joined group chat succesfully");

        const rl2 = readline.createInterface({
            input : process.stdin,
            output : process.stdout
        });

        rl2.on("line", async(line) => {

            // Handles certain commands with the group chat
            if(line.trim() === "/exit") {
                console.log("Leaving group chat...");
                rl2.close();
                await this.showMenu();
            } else if(line.split(" ")[0] === "/invite") {
                const userToInvite = line.split(" ")[1];
                const inviteRequest = xml("message", {to: roomId}, xml("x", {xmlns: "http://jabber.org/protocol/muc#user"}, xml("invite", {to: userToInvite + "@alumchat.xyz"}, xml("reason", {}, "Join the group!"))));
                await this.xmpp.send(inviteRequest);
                console.log("Invitation sent to: ", userToInvite);
            } else if(line.split(" ")[0] === "/file") {
                const filePath = line.split(" ")[1];
                await this.sendFileGC(roomId, filePath);

            } else {
                const message = xml("message", {to: roomId, type: "groupchat"}, xml("body", {}, line));
                await this.xmpp.send(message);
            }
        });

        this.xmpp.on('stanza', async (stanza) => {
            if (stanza.is('message') && stanza.getChild('body')) {
  
              if (stanza.attrs.type === "groupchat") {
                const from = stanza.attrs.from;
                const body = stanza.getChildText("body");
  
                if (from && body) {
                  console.log(`${from}: ${body}`);
                }
              }
            }
          });

    }

    // Shows the details of a specific user
    async showUserDetails(jid) {
        const username = jid + "@alumchat.xyz";

        this.xmpp.on("stanza", (stanza) => {
            if(stanza.is("iq") && stanza.attrs.type === "result") {
                const users = stanza.getChild("query", "jabber:iq:roster").getChildren('item');
                const user = users.find((user) => user.attrs.jid === username);
                if(user) {
                    const jid = user.attrs.jid;
                    const name = user.attrs.name;
                    const subscription = user.attrs.subscription;
                    console.log("Contact:", jid, "Name:", name, "Subscription:", subscription);
                } else {
                    console.log("User not found");
                }

                this.showMenu();
            }
        });

        const requestContacts = xml(
            "iq",
            {type: "get", id: "roster"},
            xml("query", {xmlns: "jabber:iq:roster"})
        );

        this.xmpp.send(requestContacts)
        .then(() => {
            console.log("Requesting Contacts...");
        }).catch((err) => {
            console.error("Error when requesting contacts: ", err);
        });

    };

    // Sets presence message and status
    async setPresenceMessage(presenceState, message) {
        const presence = xml("presence", {}, xml('show', {}, presenceState), xml('status', {}, message));
        await this.xmpp.send(presence);

        console.log("Presence status and message set to: ", presenceState, message);
        this.showMenu();
    };


    // Shows all contacts and some of their info such as subscription type, jid and name
    async mostrarUsuarios() {
        const requestContacts = xml(
            "iq",
            {type: "get", id: "roster"},
            xml("query", {xmlns: "jabber:iq:roster"})
        );

        this.xmpp.send(requestContacts)
        .then(() => {
            console.log("Requesting Contacts...");
        }).catch((err) => {
            console.error("Error when requesting contacts: ", err);
        });

        this.xmpp.on("stanza", (stanza) => {
            if (stanza.is("iq") && stanza.attrs.type === "result") {
                const contacts = stanza.getChild("query", "jabber:iq:roster").getChildren('item');
                
                console.log("Contact list: ");
                contacts.forEach((contact) => {
                    console.log("JID", contact.attrs.jid);
                    console.log("Name", contact.attrs.name);
                    console.log("Subscription", contact.attrs.subscription);
                });


                // Handles the contact presence and status requests
                this.xmpp.on("presence", (presence) => {
                    const from = presence.attrs.from;
                    const show = presence.getChild("show");
                    const status = presence.getChild("status");

                    const contact = contacts.find((contact) => contact.attrs.jid === from);
                    if(contact) {
                        const jid = contact.attrs.jid;
                        const name = contact.attrs.name;
                        const subscription = contact.attrs.subscription;
                        console.log("Contact:", jid, "Name:", name, "Subscription:", subscription);
                    } else {
                        console.log("Contact:", from, "Show:", show, "Status:", status);
                    }

                })
            }
            });
    };

    // Handles the user registration
    async registerUser(username, password) {
        netClient.connect(5222, 'alumchat.xyz', function() {
            netClient.write("<stream:stream to='alumchat.xyz' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>");
        });

        //Uses the net module to manually set the valid registering request
        netClient.on('data', async(data) => {
            if(data.toString().includes("<stream:features>")) {
                const register = `
                <iq type="set" id="reg_1" mechanism='PLAIN'>
                <query xmlns="jabber:iq:register">
                  <username>${username}</username>
                  <password>${password}</password>
                </query>
              </iq>
              `;
                await netClient.write(register);
            } else if(data.toString().includes('<iq type="result"')) {
                console.log("User registered into server");
                this.registerState = true;
                await netClient.end();
            } else if(data.toString().includes('<iq type="error"')) {
                console.log("XMPP Server error");
            }
        });

        netClient.on('close', function() {
            console.log('Connection closed');
        });
    }


    // Handles the basic 1 on 1 messaging
    async sendMessage(destinatario, mensaje) {
        const message = xml(
        "message",
        { type: "chat", to: destinatario + "@alumchat.xyz" },
        xml("body", {}, mensaje)
        );

        await this.xmpp.send(message);
    };

};

async function main() {
    loginMenu();
};

// Handles login and registration
async function loginMenu() {
    const rl = readline.createInterface({
        input : process.stdin,
        output : process.stdout
    });

    console.log("\n--- Login Menu ---");
    console.log("1. Login");
    console.log("2. Register new user");
    console.log("3. Exit");

    rl.question("Select an option: ", (answer) => {
        switch(answer) {
            case '1':
                rl.question("Enter your username: ", (username) => {
                    rl.question("Enter your password: ", async(password) => {
                        const client = new Client_XMPP(username, password);
                        try {
                            await client.connect();
                        } catch (error) {
                            console.log("Error logging in");
                            rl.close();
                            loginMenu();
                        }
                        if(client.loginState == false) {
                            console.log("Error logging in");
                            rl.close();
                            loginMenu();
                        } else if (client.loginState == true) {
                            console.log("Logged in succesfully");
                            rl.close();
                            client.showMenu();
                        }
                    });
                });
                break;
            case '2':
                rl.question("Enter your username: ", (username) => {
                    rl.question("Enter your password: ", async(password) => {
                        const client = new Client_XMPP(username, password);
                        try {
                            await client.registerUser(client.username, client.password);
                            loginMenu();
                        } catch (error) {
                            console.log("Error registering user");
                            rl.close();
                            loginMenu();
                        }
                    });
                });
                break;
            case '3':
                console.log("Exiting...");
                rl.close();
                break;
            default:
                console.log("Invalid option");
                rl.close();
                loginMenu();
                break;
        }
    });
}

main().catch((error) => {
    console.error("Fatal Error when sending request:", error);
});

// app.listen(3000, () => {
//     console.log('Server running on port 3000');
// });