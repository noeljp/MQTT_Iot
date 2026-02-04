# APRU40 IoT System - API Documentation

## Architecture implémentée

✅ **Multi-site avec isolation**
✅ **Gateways ESP32 avec connexion MQTT**
✅ **Nodes IoT (ESP32) avec ADC et Bluetooth**
✅ **Rétention données 7 jours** (nettoyage automatique quotidien)
✅ **Export CSV des données capteurs**
✅ **Temps réel via WebSocket**

---

## Modèles de données

### Site
- Groupement logique de gateways
- Isolation multi-site

### Gateway (ESP32-POE-ISO)
- Connexion MQTT/TLS vers backend
- Réception données ESP-NOW des nodes
- Publication format JSON

### Node (ESP32)
- ADC: ADS7128, ADS1119_1, ADS1119_2
- Bluetooth: Scanner Zebra DS2278
- Communication ESP-NOW vers gateway

### SensorData
- Données capteurs time-series
- Rétention 7 jours automatique

---

## APIs Disponibles

### Sites (`/api/v1/sites`)
```
GET    /                  # Liste tous les sites
POST   /                  # Créer site
GET    /:id               # Détails site
PUT    /:id               # Modifier site
DELETE /:id               # Supprimer site (+ gateways/nodes)
GET    /:id/gateways      # Gateways du site
```

### Gateways (`/api/v1/iot/gateways`)
```
GET    /                  # Liste gateways (?site_id=X&status=Y)
POST   /                  # Créer gateway
GET    /:id               # Détails gateway (?include_nodes=true)
PUT    /:id               # Modifier gateway
DELETE /:id               # Supprimer gateway (+ nodes)
GET    /:id/nodes         # Nodes connectés
GET    /:id/stats         # Statistiques gateway
POST   /:id/command       # Envoyer commande MQTT
```

### Nodes (`/api/v1/iot/nodes`)
```
GET    /                      # Liste nodes (?gateway_id=X&status=Y&bluetooth_enabled=true)
POST   /                      # Créer node
GET    /:id                   # Détails node
PUT    /:id                   # Modifier node
DELETE /:id                   # Supprimer node
PUT    /:id/gateway           # Réassigner gateway
PUT    /:id/adc-config        # Config ADC + conversions
PUT    /:id/bluetooth         # Config Bluetooth scanner
GET    /:id/sensor-data       # Données capteurs node
GET    /:id/qr-codes          # Historique QR codes
```

### Sensor Data (`/api/v1/sensor-data`)
```
GET    /latest               # Dernières données (limit=100)
GET    /history              # Historique avec filtres
GET    /export               # Export CSV
POST   /cleanup              # Nettoyer données anciennes
```

**Filtres /history et /export** :
- `node_id` : ID du node
- `gateway_id` : ID du gateway
- `site_id` : ID du site
- `adc_type` : ADS7128, ADS1119_1, ADS1119_2
- `channel` : Numéro canal (0-7 ou 0-3)
- `start_date` : ISO format (2026-01-01T00:00:00)
- `end_date` : ISO format
- `limit` : Nombre max (défaut: 1000)

---

## Format MQTT

### Topic de données (Gateway → Backend)
```
Topic: apru40/gateway/{gateway_id}/data
```

**Payload JSON** :
```json
{
  "gateway_id": "GW001",
  "timestamp": 1738454400,
  "nodes": [
    {
      "node_id": 1,
      "qr_code": "PROD12345",
      "sensors": {
        "ads7128": {
          "ch0": {"raw": 2048, "value": 12.5, "unit": "mA"},
          "ch1": {"raw": 1500, "value": 45.3, "unit": "°C"}
        },
        "ads1119_1": {
          "ch0": {"raw": 15000, "value": 95.2, "unit": "°C"}
        }
      },
      "rssi": -45,
      "battery": 3.7
    }
  ]
}
```

### Topic de statut (Gateway → Backend)
```
Topic: apru40/gateway/{gateway_id}/status

Payload:
{
  "status": "online",
  "timestamp": 1738454400
}
```

### Topic de configuration (Backend → Node via Gateway)
```
Topic: apru40/node/{node_id}/config

Payload:
{
  "cmd": "update_config",
  "node_id": 1,
  "config": {
    "acquisition": {
      "ads7128_period_ms": 2000,
      "ads1119_period_ms": 5000
    },
    "conversions": {
      "ads7128_ch0": {
        "type": "linear",
        "a": 0.00488,
        "b": 4.0,
        "unit": "mA"
      }
    },
    "bluetooth": {
      "enabled": true
    }
  },
  "timestamp": "2026-02-04T12:00:00"
}
```

---

## WebSocket Events

**Namespace** : `/`

### Événements émis par le serveur

**sensor_data** : Données capteurs en temps réel
```javascript
{
  gateway_id: "GW001",
  timestamp: "2026-02-04T12:00:00",
  nodes: [...]  // Même format que MQTT
}
```

**gateway_status** : Changement statut gateway
```javascript
{
  gateway_id: "GW001",
  status: "online",
  timestamp: "2026-02-04T12:00:00"
}
```

---

## Démarrage rapide

### 1. Installation dépendances
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configuration .env
```env
MQTT_BROKER=10.1.22.2
MQTT_PORT=1883
MQTT_USERNAME=backend
MQTT_PASSWORD=backend_secret_key
```

### 3. Lancer le backend
```bash
python run.py
```

Le backend va :
- ✅ Se connecter au broker MQTT
- ✅ Créer les tables de base de données
- ✅ Démarrer le service WebSocket
- ✅ Lancer la tâche de nettoyage quotidien
- ✅ Écouter sur http://localhost:5000

---

## Exemples d'utilisation

### Créer un site
```bash
curl -X POST http://localhost:5000/api/v1/sites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Site Paris", "location": "75001 Paris"}'
```

### Créer un gateway
```bash
curl -X POST http://localhost:5000/api/v1/iot/gateways \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_id": "GW001",
    "name": "Gateway Building A",
    "site_id": "SITE_UUID",
    "mac_address": "24:0A:C4:XX:XX:XX",
    "ip_address": "192.168.1.100"
  }'
```

### Créer un node
```bash
curl -X POST http://localhost:5000/api/v1/iot/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": 1,
    "name": "Sensor Node 1",
    "gateway_id": "GATEWAY_UUID",
    "mac_address": "24:0A:C4:YY:YY:YY",
    "bluetooth_enabled": true,
    "scanner_model": "Zebra DS2278",
    "adc_config": {
      "ads7128_enabled": true,
      "ads7128_period_ms": 1000,
      "ads1119_1_enabled": true,
      "ads1119_1_period_ms": 2000
    },
    "sensor_conversions": {
      "ads7128_ch0": {
        "type": "linear",
        "a": 0.00488,
        "b": 4.0,
        "unit": "mA"
      }
    }
  }'
```

### Exporter données CSV
```bash
curl "http://localhost:5000/api/v1/sensor-data/export?node_id=NODE_UUID&start_date=2026-02-01T00:00:00" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o sensor_data.csv
```

---

## Maintenance

### Nettoyage manuel des données
```bash
curl -X POST http://localhost:5000/api/v1/sensor-data/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

### Monitoring MQTT
```bash
# Écouter toutes les données
mosquitto_sub -h 10.1.22.2 -u monitor -P monitor_pass -t "apru40/#" -v
```

---

## Prochaines étapes

✅ Backend complet
✅ Modèles de données
✅ APIs REST
✅ Service MQTT
✅ WebSocket temps réel
✅ Export CSV

🔄 En cours : Frontend React/TypeScript

---

Pour plus d'informations : voir [README.md](../README.md)
