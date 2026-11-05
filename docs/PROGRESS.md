# Progress

อ้างอิง [REQUIREMENT.md](REQUIREMENT.md) ส่วน Roadmap การพัฒนาเบื้องต้น (Draft) สถานะด้านล่างเป็นภาพรวมสำหรับติดตามงาน ยังไม่ใช่ขอบเขตหรือกำหนดส่งที่ยืนยันแล้ว Phase 1 ใช้ mock data; Phase 2 มี Back Office สำหรับพัฒนาในเครื่องและโค้ดเชื่อม Firebase แต่ยังไม่ได้ทดสอบกับ project จริง

สถานะที่ใช้: `Not started` · `In progress` · `Done`

## Open work index

| งาน                                                                             | สถานะ       | เป้าหมายคร่าว ๆ                                                                 |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| [Phase 1 — Foundation & Timeline Engine](#phase-1--foundation--timeline-engine) | In progress | แอปและ timeline จาก mock data พร้อม; รอ Firebase จริงและตรวจหน้าจอด้วยตา        |
| [Phase 2 — Database & Back Office](#phase-2--database--back-office)             | In progress | schema, CRUD และ draft/publish ในเครื่องพร้อม; รอ Firebase จริงและฟอร์มเฉพาะงาน |
| [Phase 3 — Public Explorer](#phase-3--public-explorer)                          | Not started | ให้ผู้ใช้ค้นหา กรอง และสำรวจ timeline                                           |
| [Phase 4 — Interaction & Polish](#phase-4--interaction--polish)                 | Not started | ปรับการใช้งาน การจัดวาง และประสิทธิภาพ                                          |
| [Phase 5 — Advanced Lore Features](#phase-5--advanced-lore-features)            | Not started | เพิ่มเครื่องมือสำรวจ lore ขั้นสูง                                               |

## Phase 1 — Foundation & Timeline Engine

**สถานะ:** In progress

- [x] ตั้งค่า React, TypeScript, Vite, Tailwind CSS และธีมสำหรับหน้า public
- [x] สร้าง timeline จาก mock data ที่เลื่อนและซูมได้ พร้อมปุ่มควบคุมแบบไม่ต้องลาก
- [x] แสดง point, range, break ที่ย่อช่วงเวลา, image card และ dialog รายละเอียดเหตุการณ์
- [x] เตรียม Firebase SDK และ optional initializer ที่ไม่ต้องมี credentials เพื่อรัน mock data
- [ ] เมื่อมี Firebase project: ใส่ค่าจริงใน `.env.local` และตรวจการ initialize กับ project นั้น
- [ ] ตรวจหน้าจอจริงด้วยตาที่ขนาดมือถือและเดสก์ท็อป รวมถึงการลาก ซูม เปิด/ปิด dialog และ keyboard focus
- [ ] แทน mock dates, descriptions และภาพตัวอย่างด้วยข้อมูล lore ที่มีแหล่งอ้างอิง (ต่อเนื่องกับ Phase 2)

## Phase 2 — Database & Back Office

**สถานะ:** In progress

- [x] กำหนด Zod schema สำหรับ timeline, event, character, era, region, source, relationship และ settings โดยแยกความแน่นอนของเวลาออกจาก lore status
- [x] ทำ repository สำหรับ Firestore และ local sandbox เฉพาะ development; Back Office จัดการ record ในทุก collection ผ่าน JSON editor ได้
- [x] ทำ overview จำนวน record และปุ่ม save, publish, move to draft, delete พร้อม validation และการยืนยันก่อนลบ
- [x] เตรียม Firebase Authentication แบบ email/password, ตรวจ owner document และ Firestore Rules ที่จำกัดสิทธิ์เขียน
- [x] รองรับการกำหนด breaks และ lane ของ timeline ใน schema และ JSON editor
- [ ] เมื่อมี Firebase project: เปิด Authentication, สร้าง owner, deploy rules และทดสอบ CRUD/สิทธิ์ owner ด้วยข้อมูลจริงตาม [คู่มือตั้งค่า](FIREBASE-SETUP.md)
- [ ] ทำฟอร์มเฉพาะสำหรับ event, character, timeline/break และการเลือก entity ที่เชื่อมกัน แทนการแก้ JSON โดยตรง
- [ ] ตรวจการมีอยู่ของ timeline/source/character/era/region ที่อ้างถึง และจัดการผลกระทบเมื่อลบ record ที่ถูกอ้างอิง
- [ ] ทำ Media Library และการตั้งค่า theme/default viewer ให้ใช้งานจริง; Cloud Storage upload ยังเป็นตัวเลือก
- [ ] ตรวจหน้าจอ Back Office ด้วยตา รวมถึง mobile, keyboard, error state และ Firebase sign-in
- [ ] เชื่อม published Firestore content เข้ากับ public explorer เมื่อเข้าสู่ Phase 3; ตอนนี้ public timeline ยังแสดง mock data

## Phase 3 — Public Explorer

**สถานะ:** Not started

- ทำ landing page, search, filter และมุมมอง world, character, era/region บนข้อมูลร่วมกัน
- เพิ่ม deep link ของ event, responsive UI และการแสดงระดับความแน่นอนของ lore

## Phase 4 — Interaction & Polish

**สถานะ:** Not started

- เพิ่ม animation, focus character และการเน้นความสัมพันธ์ของเหตุการณ์
- ปรับ auto layout ไม่ให้ card ทับกัน พร้อม performance และ accessibility

## Phase 5 — Advanced Lore Features

**สถานะ:** Not started

- เพิ่ม relationship explorer, compare characters, story mode และ spoiler controls
- รองรับ import/export ข้อมูลตามขอบเขตที่จะกำหนดในภายหลัง
