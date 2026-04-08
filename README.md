# 🦅 Goofy Bird - Real-time Multiplayer Game

Goofy Bird! เกมเว็บบราวเซอร์สไตล์อาร์เคดที่ได้แรงบันดาลใจจากเกมสุดคลาสสิก นำมายกระดับด้วยระบบ **Multiplayer** ผู้เล่นสามารถบินหลบอุปสรรคสุดป่วนไปพร้อมกับเพื่อนๆ ในห้องเดียวกันได้แบบเรียลไทม์ ตัวเกมมาพร้อมกับระบบฟิสิกส์ที่เขียนขึ้นเอง และหน้า Admin Dashboard สำหรับจัดการแผนที่และระดับความยากอย่างอิสระ

## ✨ Features

- **Multiplayer Real-time Sync:** มองเห็นเพื่อน (Ghost) บินไปพร้อมกันแบบเรียลไทม์ผ่าน Supabase Channel
- **Dynamic Custom Physics:** ระบบฟิสิกส์เกม (แรงโน้มถ่วง, การกระโดด, การชน) ที่เขียนขึ้นเองทั้งหมด ทำงานลื่นไหลที่ 60 FPS
- **Obstacle Varieties:** อุปสรรคสุดกวนที่ไม่ได้มีแค่ท่อ! เช่น หินย้อยดักซุ่ม (Stalactite), กบกระโดด (Frog) และกงจักรแกว่ง (Pendulum)
- **Host Migration & Anti-AFK:** ระบบสืบทอดหัวหน้าห้องอัตโนมัติเมื่อ Host ออกจากเกม และระบบเตะผู้เล่นที่พับหน้าจอ (AFK) เพื่อป้องกันเกมค้าง
- **Self-Healing State:** ระบบตรวจสอบการตายผ่าน Heartbeat ป้องกันปัญหาเน็ตเวิร์คดีเลย์หรือข้อมูลสูญหาย (Packet Loss)
- **Admin Dashboard:** หน้าจัดการหลังบ้านสำหรับเพิ่มแผนที่ อัปโหลดพื้นหลัง ตั้งค่าเพลง และกำหนดอุปสรรคแยกตามความยาก (Easy, Normal, Hard)

## 🛠 Tech Stack

### ฝั่งหน้าเว็บ (Frontend)
- **Next.js (React):** เฟรมเวิร์คหลักสำหรับการสร้าง UI และจัดการ Routing
- **Framer Motion:** ไลบรารีสำหรับการทำแอนิเมชัน UI หน้าเมนูและหน้าต่างแจ้งเตือนให้นุ่มนวล
- **Tailwind CSS:** Utility-first CSS framework สำหรับจัดการสไตล์และ Responsive Design แบบรวดเร็ว
- **Lucide React:** ชุดไอคอน SVG สไตล์มินิมอล

### ฝั่งเซิร์ฟเวอร์ & ฐานข้อมูล (Backend / BaaS)
- **Supabase:** บริการ Backend-as-a-Service ครบวงจร
  - **PostgreSQL Database:** เก็บข้อมูลผู้เล่น, คะแนนสูงสุด (High Score), และข้อมูลแผนที่
  - **Supabase Realtime:** ใช้เทคโนโลยี WebSockets สำหรับรับส่งพิกัดผู้เล่นแบบเรียลไทม์
  - **Supabase Storage:** จัดเก็บไฟล์รูปภาพพื้นหลังแผนที่และสินทรัพย์ในเกม
  - **Supabase Auth:** ระบบจัดการการเข้าสู่ระบบของผู้ใช้งาน

## 💻 พัฒนาโดยใช้ภาษา
<br />
[![My Skills](https://skillicons.dev/icons?i=html,css,ts)](https://skillicons.dev)
<br />
<br />

## 🎨 Framework & Styling
<br />
[![My Skills](https://skillicons.dev/icons?i=nextjs,react,tailwind)](https://skillicons.dev)
<br />
<br />

## ⚙️ Backend & Database
<br />
[![My Skills](https://skillicons.dev/icons?i=supabase,postgres)](https://skillicons.dev)
<hr>

*🔗 Link to website* : [ใส่ลิงก์ Vercel หรือ Netlify ของบอสตรงนี้]

## 🚀 Deploy

สามารถ Deploy โปรเจกต์นี้ได้อย่างง่ายดายผ่านแพลตฟอร์มอย่าง **Vercel** (แนะนำสำหรับ Next.js) หรือ **Netlify** โดยอย่าลืมตั้งค่า Environment Variables (`.env.local`) สำหรับเชื่อมต่อกับ Supabase ดังนี้:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
