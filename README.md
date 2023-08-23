# XMPP Client
---

### Introduction
This project is dedicated to the development of an XMPP (Extensible Messaging and Presence Protocol) client that aligns perfectly with the protocol's established standards.

### Main Objectives:

- **Implementing the Protocol:**  
  - Design a command-line interface (CLI) XMPP client.
  - Ensure compatibility with other XMPP servers and clients based on the protocol's standards.

- **Grasping XMPP's Essence:**  
  - Deep-dive into XMPP's core functionalities.
  - Provide insights into the real-time online messaging process.
  - Offer a behind-the-scenes perspective throughout the development phase.

- **Exploring XMPP Services:**  
  - Understand and implement a wide range of services such as:
    - Direct messaging
    - Group chats
    - User presence monitoring
    - Subscription alerts
    - File transfers
  - Gain insights into the protocol's strengths and potential limitations.

- **Embracing Asynchronous Programming:**  
  - Harness the power of asynchronous programming techniques.
  - Ensure agility and effectiveness across all client features.

---
## Prerequisites
- node v16.15.^

## Dependencies
- @xmpp/client ^0.13.1
- @xmpp/debug ^0.13.0
- dotenv 16.3.1
- net ^1.0.2

## Usage
First in the command line, inside the backend directory, install the dependencies via
```
npm install
```

And then run the project via
```
node index.js
```
The project operates using a command-line interface (CLI). It's structured around choosing options, requiring users to respond to the given prompts. For instance:


--- Login Menu ---  
1. Login  
2. Register new user  
3. Exit  

```
Current user: Testuser

Menu:
1. Send Message
2. Delete account from server
3. Show contacts and their info
4. Add users as contacts
5. Show details of a user
6. Group chatting
7. Set presence message
8. Send/Receive files
9. Close Session
Select an option:
```
Typically, the client prompts the user for specific inputs within submenus when required. If the input is incorrect or leads to an error, the user is redirected to the primary menu. This approach ensures that the interface remains user-friendly and provides a structured flow for users.

In the context of group chats, the client offers a few key commands, even though it doesn't always provide direct prompts. These commands include:
- /exit
Allows the user to leave the group chat they're in.

- /invite {user}
Invites another user to the chat by simply entering their username following the "/invite" command.

- /file {path}
Enables users to share files in the group chat. The file path should be relative to the backend folder.

Outside of these specific commands, users can freely type their messages, which will be broadcasted to the entire group chat.

## Author  
👤 Estefanía Elvira Ramos 
- <a href="https://github.com/Estef072/Proyecto-Redes">Github</a> 
