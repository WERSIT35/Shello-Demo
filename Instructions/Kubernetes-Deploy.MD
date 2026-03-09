# Shello Kubernetes Deployment

---

# 1. Namespace

```
apiVersion: v1
kind: Namespace
metadata:
  name: shello
```

---

# 2. Mongo Deployment

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo
          ports:
            - containerPort: 27017
```

---

# 3. Backend Deployment

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      containers:
        - name: server
          image: your-dockerhub/shello-server:latest
          ports:
            - containerPort: 5000
```

---

# 4. Frontend Deployment

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client
spec:
  replicas: 2
  selector:
    matchLabels:
      app: client
  template:
    metadata:
      labels:
        app: client
    spec:
      containers:
        - name: client
          image: your-dockerhub/shello-client:latest
          ports:
            - containerPort: 80
```

---

# 5. Ingress with TLS

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shello-ingress
spec:
  tls:
    - hosts:
        - shello.com
      secretName: shello-tls
  rules:
    - host: shello.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: client
                port:
                  number: 80
```

---

Use Kubernetes Secrets for environment variables.
Enable Network Policies.
Enable cert-manager for SSL automation.

Production-ready Kubernetes deployment structure.
