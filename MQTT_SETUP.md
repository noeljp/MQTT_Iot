# Configuration MQTT Broker (Mosquitto)

## Installation et Configuration

### 1. Copier les fichiers de configuration

```bash
# Copier la configuration principale
sudo cp mosquitto.conf /etc/mosquitto/mosquitto.conf

# Copier le fichier ACL
sudo cp mosquitto_acl.conf /etc/mosquitto/acl
```

### 2. Créer les utilisateurs et mots de passe

```bash
# Créer l'utilisateur admin
sudo mosquitto_passwd -c /etc/mosquitto/passwords admin

# Ajouter l'utilisateur backend (pour l'application Flask)
sudo mosquitto_passwd /etc/mosquitto/passwords backend

# Ajouter des gateways
sudo mosquitto_passwd /etc/mosquitto/passwords gateway01
sudo mosquitto_passwd /etc/mosquitto/passwords gateway02

# Ajouter un utilisateur monitoring (lecture seule)
sudo mosquitto_passwd /etc/mosquitto/passwords monitor
```

**Mots de passe suggérés :**
- admin: `admin_mqtt_2026`
- backend: `backend_secret_key`
- gateway01: `gateway01_pass`
- gateway02: `gateway02_pass`
- monitor: `monitor_pass`

### 3. Définir les permissions

```bash
# S'assurer que les fichiers appartiennent à mosquitto
sudo chown mosquitto:mosquitto /etc/mosquitto/passwords
sudo chown mosquitto:mosquitto /etc/mosquitto/acl
sudo chmod 600 /etc/mosquitto/passwords
sudo chmod 644 /etc/mosquitto/acl
```

### 4. Redémarrer Mosquitto

```bash
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
```

### 5. Mettre à jour le fichier .env du backend

Modifiez `/home/jp/Documents/dev/MQTT_Iot/backend/.env` :

```env
MQTT_BROKER=10.1.22.2
MQTT_PORT=1883
MQTT_USERNAME=backend
MQTT_PASSWORD=backend_secret_key
```

## Tests de connexion

### Test avec authentification (réussira)

```bash
# Publication avec utilisateur autorisé
mosquitto_pub -h 10.1.22.2 -u backend -P backend_secret_key -t apru40/gateway01/data -m '{"temp": 25}'

# Souscription avec utilisateur autorisé
mosquitto_sub -h 10.1.22.2 -u monitor -P monitor_pass -t apru40/# -v
```

### Test sans authentification (échouera)

```bash
# Cela devrait échouer car allow_anonymous est false
mosquitto_pub -h 10.1.22.2 -t test/topic -m "test"
```

### Test de violation d'ACL (échouera)

```bash
# L'utilisateur monitor ne peut pas publier (lecture seule)
mosquitto_pub -h 10.1.22.2 -u monitor -P monitor_pass -t apru40/test -m "test"
```

## Structure des Topics APRU40

```
apru40/
├── <gateway_id>/
│   ├── data              # Données des capteurs
│   ├── status            # Statut du gateway
│   ├── alert/
│   │   ├── security     # Alertes de sécurité
│   │   └── system       # Alertes système
│   └── config/          # Configuration (lecture par gateway)
```

## Règles ACL

- **admin** : Accès total (lecture/écriture sur tous les topics)
- **backend** : Lecture/écriture sur apru40/# et lecture sur test/#
- **gateway01, gateway02** : Peuvent publier uniquement sur leurs topics spécifiques
- **monitor** : Lecture seule sur apru40/# et test/#

## Ajouter un nouveau Gateway

```bash
# 1. Créer l'utilisateur
sudo mosquitto_passwd /etc/mosquitto/passwords gateway03

# 2. Ajouter les permissions dans /etc/mosquitto/acl
sudo nano /etc/mosquitto/acl
```

Ajouter :
```
user gateway03
topic write apru40/gateway03/+
topic write apru40/gateway03/alert/#
topic read apru40/gateway03/config/#
```

```bash
# 3. Redémarrer Mosquitto
sudo systemctl restart mosquitto
```

## Dépannage

### Vérifier les logs

```bash
sudo tail -f /var/log/mosquitto/mosquitto.log
```

### Tester la connectivité

```bash
# Vérifier que Mosquitto écoute
sudo netstat -tuln | grep 1883

# Tester avec verbose
mosquitto_pub -h 10.1.22.2 -u backend -P backend_secret_key -t test/topic -m "test" -d
```

### Vérifier la configuration

```bash
# Valider la syntaxe de la configuration
mosquitto -c /etc/mosquitto/mosquitto.conf -v
```
