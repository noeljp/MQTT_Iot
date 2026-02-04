# Configuration Sudo pour MQTT Management

## Permettre à l'utilisateur backend d'exécuter les commandes MQTT sans mot de passe

Pour que l'API backend puisse gérer Mosquitto sans demander de mot de passe sudo, ajoutez cette configuration :

```bash
# Créer le fichier sudoers pour MQTT
sudo visudo -f /etc/sudoers.d/mosquitto-admin
```

Ajoutez les lignes suivantes (remplacez `jp` par votre nom d'utilisateur) :

```
# Allow MQTT management commands without password
jp ALL=(ALL) NOPASSWD: /usr/bin/mosquitto_passwd
jp ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart mosquitto
jp ALL=(ALL) NOPASSWD: /usr/bin/systemctl status mosquitto
jp ALL=(ALL) NOPASSWD: /usr/bin/systemctl is-active mosquitto
```

Ou bien, si vous exécutez le backend avec un utilisateur spécifique (comme www-data pour un serveur web), remplacez `jp` par cet utilisateur.

### Application automatique

```bash
# Créer le fichier sudoers
echo "# Allow MQTT management commands without password
$USER ALL=(ALL) NOPASSWD: /usr/bin/mosquitto_passwd
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart mosquitto
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status mosquitto
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl is-active mosquitto" | sudo tee /etc/sudoers.d/mosquitto-admin

# Définir les bonnes permissions
sudo chmod 440 /etc/sudoers.d/mosquitto-admin
```

### Vérification

```bash
# Tester que sudo fonctionne sans mot de passe
sudo -n systemctl status mosquitto
```

Si aucun mot de passe n'est demandé, la configuration est correcte.
