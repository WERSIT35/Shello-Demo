# Shello Complete Production Deployment Guide

---

# Step 1: Buy Domain

* Purchase domain from Namecheap or similar
* Point domain to Cloudflare

---

# Step 2: Setup Cloudflare

* Enable SSL (Full Strict)
* Enable WAF
* Enable DDoS protection
* Enable Bot protection

---

# Step 3: Rent VPS

Recommended providers:

* DigitalOcean
* Hetzner
* AWS EC2

Minimum:

* 2 CPU
* 4GB RAM

---

# Step 4: Configure Server

```
sudo apt update
sudo apt install docker docker-compose nginx
```

Enable firewall:

```
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

# Step 5: Deploy Application

* Clone repository
* Add .env file
* Run docker compose up -d

---

# Step 6: Setup Reverse Proxy (Nginx)

* Forward traffic to Docker containers
* Enable HTTPS

---

# Step 7: Enable SSL

Use:

* Cloudflare SSL
  OR
* Certbot (Let's Encrypt)

---

# Step 8: Monitoring

* Setup PM2
* Setup uptime monitoring
* Enable logging

---

Your Shello platform is now globally live and secured.
