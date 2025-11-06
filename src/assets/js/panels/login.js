const { Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
import { popup, database, changePanel, addAccount, accountSelect, config } from '../utils.js';

class Login {
  static id = "login";
  async init(config) {
    this.config = config;
    this.db = new database();

    const loginMode = document.querySelector('.login-mode');
    const loginHome = document.querySelector('.login-home');
    const loginOffline = document.querySelector('.login-offline');

    const microsoftBtn = document.querySelector('.connect-home');
    const offlineBtn = document.querySelector('.connect-offline');

    // ====== Selección de modo ======
    document.querySelector('.connect-premium').addEventListener('click', () => {
      loginMode.style.display = 'none';
      loginHome.style.display = 'block';
    });

    document.querySelector('.connect-crack').addEventListener('click', () => {
      loginMode.style.display = 'none';
      loginOffline.style.display = 'block';
    });

    // ====== Cancelar ======
    document.querySelectorAll('.cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        loginHome.style.display = 'none';
        loginOffline.style.display = 'none';
        loginMode.style.display = 'block';
      });
    });

    // ====== Login Microsoft ======
    microsoftBtn.addEventListener('click', async () => {
      const pop = new popup();
      pop.openPopup({
        title: 'Conectando...',
        content: 'Iniciando sesión con Microsoft',
        color: 'var(--color)'
      });

      try {
        const acc = await ipcRenderer.invoke('Microsoft-window', this.config.client_id);
        if (!acc || acc === 'cancel') {
          pop.closePopup();
          return;
        }
        await this.saveData(acc);
        pop.closePopup();
      } catch (err) {
        pop.openPopup({ title: 'Error', content: err, options: true });
      }
    });

    // ====== Login Offline (No Premium) ======
    offlineBtn.addEventListener('click', async () => {
      const pop = new popup();
      const nick = document.querySelector('.email-offline').value.trim();

      if (nick.length < 3 || nick.match(/ /g)) {
        pop.openPopup({
          title: 'Error',
          content: 'Nombre no válido. (mínimo 3 caracteres, sin espacios)',
          options: true
        });
        return;
      }

      pop.openPopup({
        title: 'Conectando...',
        content: 'Iniciando sesión sin conexión...',
        color: 'var(--color)'
      });

      try {
        const acc = await Mojang.login(nick);

        if (acc.error) {
          pop.openPopup({
            title: 'Error',
            content: acc.message || 'Error desconocido al iniciar sesión',
            options: true
          });
          return;
        }

        await this.saveData(acc);

        // 🔹 ocultar login solo después de guardar datos
        loginOffline.style.display = 'none';
        loginMode.style.display = 'none';
        loginHome.style.display = 'none';

        pop.closePopup();
      } catch (e) {
        pop.openPopup({
          title: 'Error',
          content: e.message || 'Fallo al conectar.',
          options: true
        });
      }
    });
  }

  async saveData(accountData) {
    const configClient = await this.db.readData('configClient');
    const acc = await this.db.createData('accounts', accountData);
    configClient.account_selected = acc.ID;
    await this.db.updateData('configClient', configClient);
    await addAccount(acc);
    await accountSelect(acc);
    changePanel('home'); // ← Esto te lleva al menú principal
  }
}

export default Login;
