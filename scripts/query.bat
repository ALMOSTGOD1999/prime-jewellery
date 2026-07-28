@echo off
setlocal
set PGSSLMODE=disable

node -e "const{Client}=require('pg');require('dotenv').config();const url=process.env.DATABASE_URL.replace(/sslmode=[^&]+/,'sslmode=disable');const c=new Client({connectionString:url});c.connect().then(()=>Promise.all([c.query('SELECT id,name,parent_id,status FROM users WHERE id IN(997860,248892)'),c.query('SELECT max(id) as max_id FROM users')])).then(([r1,r2])=>{const fs=require('fs');fs.writeFileSync('scripts/out.txt',JSON.stringify(r1.rows));fs.writeFileSync('scripts/out2.txt',JSON.stringify(r2.rows));c.end()}).catch(e=>{require('fs').writeFileSync('scripts/out.txt','ERROR:'+e.message);process.exit(1)})"
