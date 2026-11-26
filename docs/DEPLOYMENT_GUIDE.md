# คู่มือการติดตั้งและดูแลเว็บไซต์ ฅนหนีเที่ยว (KON NEE TIEW)

## 1. สถาปัตยกรรมระบบ
- **Frontend**: React 19 + TypeScript + Tailwind CSS (Responsive Editorial Travel Blog)
- **Backend API**: Express (`server.ts`) พร้อมระบบอัปโหลดภาพถ่ายและสร้าง `/sitemap.xml`, `/robots.txt` อัตโนมัติ
- **Database**: PostgreSQL (Cloud SQL + Drizzle ORM ใน `src/db/schema.ts`)
- **Authentication**: Firebase Authentication (Google Sign-In) ตรวจสอบสิทธิ์ฝั่งเซิร์ฟเวอร์ด้วย `firebase-admin` และตาราง `users`

## 2. การตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
ดูตัวอย่างทั้งหมดได้ใน `.env.example`:
- `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`: ข้อมูลเชื่อมต่อ PostgreSQL
- `ADMIN_EMAIL`: อีเมลบัญชี Google ที่ได้รับสิทธิ์ผู้ดูแลระบบ (Admin) อัตโนมัติ
- `APP_URL`: URL ของเว็บไซต์สำหรับใช้สร้างลิงก์ใน `/sitemap.xml`

## 3. การเข้าสู่ระบบผู้ดูแล (Admin CMS)
1. กดปุ่ม **เข้าสู่ระบบผู้ดูแล** บนแถบเมนูด้านบน หรือไปที่ `/admin`
2. เข้าสู่ระบบด้วยบัญชี Google ที่กำหนดไว้ใน `ADMIN_EMAIL` (หรือบัญชีแรกที่เข้าสู่ระบบ)
3. ภายในแดชบอร์ดสามารถใช้งานได้ครบทุกเมนู:
   - **Dashboard**: สรุปจำนวนบทความทั้งหมด เผยแพร่ ฉบับร่าง และภูมิภาคที่มีบทความ
   - **จัดการบทความ**: ค้นหา กรอง ปักหมุดบทความแนะนำ สลับสถานะเผยแพร่/ฉบับร่าง แก้ไข และลบ
   - **เพิ่มบทความใหม่**: แก้ไข URL Slug, ข้อมูลทริปฉบับย่อ, Rich Text Editor, อัปโหลดรูปหน้าปก/ในเนื้อหา/อัลบั้มภาพ และดูตัวอย่างก่อนเผยแพร่
   - **จัดการหมวดหมู่/ภูมิภาค**: ดูสถิติแยกตาม 6 ภูมิภาคของประเทศไทย
   - **คลังรูปภาพ**: อัปโหลดและจัดการไฟล์ภาพถ่ายที่ใช้ซ้ำได้
   - **ตั้งค่าเว็บไซต์**: แก้ไขชื่อเว็บ สโลแกน โลโก้ Hero Banner หน้าเกี่ยวกับเรา และโซเชียลมีเดีย

## 4. คำสั่งสำหรับการพัฒนาและการ Build Production
- ติดตั้งแพ็กเกจ: `npm install`
- รันเซิร์ฟเวอร์พัฒนา (พอร์ต 3000): `npm run dev`
- สร้างไฟล์ Production: `npm run build`
- รัน Production Server: `npm start`

## 5. การ Deploy ผ่าน GitHub ไปยัง Netlify (และใช้โดเมน Netlify)
โปรเจกต์นี้มีไฟล์ `netlify.toml` ตั้งค่าไว้พร้อมแล้ว:
1. กดแท็บ **GitHub** ใน AI Studio เพื่อ Push โค้ดล่าสุดขึ้น Repository ของคุณ
2. เข้าเว็บ [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project** → เลือก **GitHub** และเลือก repo `KON-NEE-TIEW`
3. Netlify จะอ่านค่าจาก `netlify.toml` อัตโนมัติ (`Build command: npm run build`, `Publish directory: dist`) กด **Deploy site** ได้เลย
4. เว็บไซต์หน้าแรก หน้าสถานที่ท่องเที่ยว หน้าเกี่ยวกับเรา และหน้าบทความจะเปิดใช้งานบนโดเมน `.netlify.app` ได้ทันที
5. **หากต้องการใช้งานระบบหลังบ้าน (Admin CMS) + ฐานข้อมูล PostgreSQL บนโดเมน Netlify ด้วย:**
   - กด **Publish** แอปใน AI Studio เพื่อรับ URL ของ Backend (Cloud Run)
   - เปิดไฟล์ `netlify.toml` เอาเครื่องหมาย `#` หน้าบล็อก `/api/*` และ `/uploads/*` ออก แล้วใส่ URL ของ Cloud Run แทน `YOUR_BACKEND_URL` จากนั้น Push ขึ้น GitHub อีกครั้ง
   - เพิ่มโดเมน `.netlify.app` ของคุณใน Firebase Console → Authentication → Settings → Authorized domains เพื่อให้ล็อกอิน Google ในหน้า `/admin` ทำงานได้

