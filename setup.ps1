cd C:\Users\Administrator\.gemini\antigravity\scratch\gefahrstoff-management

# Backend setup
cd backend
npm install
npx prisma init
cd ..

# Frontend setup
npx -y create-vite@latest frontend --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom lucide-react clsx tailwind-merge
cd ..
