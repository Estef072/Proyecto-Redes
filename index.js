const XMPPClient = require("./client");

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new Client();

const menuOptions = [
  'REGISTRARSE',
  'INICIAR SESION',
  'CERRAR SESION',
  'ELIMINAR CUENTA',
  'SALIR'
];

async function main() {
  console.log('\n----BIENVENIDO A CHATSEER----');

  while (true) {
    const choice = await showMenu();

    switch (choice) {
      case 1:
        await registerUser();
        break;
      case 2:
        await loginUser();
        break;
      case 3:
        await logoutUser(); // Asumo que existe un método logout en XMPPClient
        break;
      case 4:
        await deleteUser(); // Asumo que existe un método delete en XMPPClient
        break;
      case 5:
        console.log('\nGracias por usar CHATSEER. ¡Vuelva pronto!');
        rl.close();
        return;
      default:
        console.log('Opcion invalida! Intente de nuevo!');
    }
  }
}

async function showMenu() {
  console.log('\nMENU:');
  menuOptions.forEach((option, index) => console.log(`[${index + 1}] ${option}`));
  return parseInt(await questionAsync('Opcion -> '));
}

async function questionAsync(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function registerUser() {
  console.log('\nREGISTRARSE:');
  const username = await questionAsync('Usuario: ');
  const password = await questionAsync('Contraseña: ');
  const email = `${username}@alumchat.xyz`;

  try {
    await client.register(username, password, email);
    console.log('\nRegistro exitoso. Ahora puedes iniciar sesión con tus credenciales.');
  } catch (err) {
    console.log('\nError: ' + err.message);
  }
}

async function loginUser() {
  console.log('\nINICIAR SESIÓN:');
  const username = await questionAsync('Usuario: ');
  const password = await questionAsync('Contraseña: ');

  try {
    await client.login(username, password);
    console.log('\nIngreso exitoso.');
  } catch (err) {
    console.log('\nError: ' + err.message);
  }
}

async function logoutUser() {
  try {
    await client.logout(); // Suponiendo que existe un método logout en XMPPClient
    console.log('\nCierre de sesión exitoso.');
  } catch (err) {
    console.log('\nError: ' + err.message);
  }
}

async function deleteUser() {
  console.log('\nELIMINAR CUENTA:');
  const confirmation = await questionAsync('¿Estás seguro de que quieres eliminar tu cuenta? (sí/no): ');

  if (confirmation.toLowerCase() === 'sí') {
    try {
      await client.delete(); // Suponiendo que existe un método delete en XMPPClient
      console.log('\nCuenta eliminada con éxito.');
    } catch (err) {
      console.log('\nError: ' + err.message);
    }
  } else {
    console.log('\nEliminación de cuenta cancelada.');
  }
}

main().catch(err => console.error(err));
