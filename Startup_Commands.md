# Shutdown
kill $(lsof -ti :8000) 2>/dev/null                    # Chatbot
kill $(lsof -ti :4200) 2>/dev/null                    # Admin
export DOCKER_HOST="unix:///var/run/docker.sock"
cd AttendX && docker compose down                     # Postgres, Redis, Backend
kill $(lsof -ti :11434) 2>/dev/null                   # Ollama
Restart After Reboot
# 1. Ensure Docker is running
sudo systemctl start docker

# 2. Start Docker stack
export DOCKER_HOST="unix:///var/run/docker.sock"
cd AttendX && docker compose up -d --build

# 3. Start Ollama
ollama serve &

# 4. Start Chatbot
cd ../Chatbot && nohup ./venv/bin/python chatbot_app.py > /tmp/attendx-chatbot.log 2>&1 &

# 5. Start Admin
cd ../AttendX/admin && nohup npm start > /tmp/attendx-admin.log 2>&1 &
The full detailed guide (including verification steps and a one-shot restart.sh script) is now in Latest_Config.md at the bottom.



also implement the auto triggerrefresh ai knowledge on dtaa addition and deletion in the system in a standard manner.