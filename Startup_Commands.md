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


# command to delete all data from the database:

docker exec -i attendance_db psql -U postgres -d attendance_db -c "TRUNCATE TABLE \"users\" CASCADE; TRUNCATE TABLE \"batches\" CASCADE; TRUNCATE TABLE \"sections\" CASCADE; TRUNCATE TABLE \"Sheets\" CASCADE; TRUNCATE TABLE \"students\" CASCADE; TRUNCATE TABLE \"attendance\" CASCADE; TRUNCATE TABLE \"subjects\" CASCADE; TRUNCATE TABLE \"routines\" CASCADE; TRUNCATE TABLE \"notifications\" CASCADE; TRUNCATE TABLE \"SyncJobs\" CASCADE; TRUNCATE TABLE \"lecturers\" CASCADE; TRUNCATE TABLE \"audit_logs\" CASCADE; TRUNCATE TABLE \"sequelize_meta\" CASCADE;"

# This keeps the table structure but removes all rows. After running, you'll need to re-run migrations and seed to have the admin user again:

docker exec -i attendance_backend npm run migrate
docker exec -i attendance_backend npm run seed


npx playwright test tests/setup.spec.js  --workers=1