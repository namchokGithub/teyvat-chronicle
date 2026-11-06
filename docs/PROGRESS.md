# Progress

อ้างอิง [REQUIREMENT.md](REQUIREMENT.md) ส่วน Roadmap การพัฒนาเบื้องต้น (Draft) สถานะด้านล่างเป็นภาพรวมสำหรับติดตามงาน ยังไม่ใช่ขอบเขตหรือกำหนดส่งที่ยืนยันแล้ว ผู้ใช้ยืนยันว่าเชื่อม Firebase และตรวจ Phase 1 ตามขั้นตอนแล้ว; เมื่อไม่มีค่า Firebase ใน environment หน้า public จะใช้ mock data ส่วนการทดสอบสิทธิ์และข้อมูลจริงของ Phase 2–3 ยังติดตามแยกกัน

สถานะที่ใช้: `Not started` · `In progress` · `Done`

## Open work index

| งาน                                                                  | สถานะ       | เป้าหมายคร่าว ๆ                                                         |
| -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| [Phase 2 — Database & Back Office](#phase-2--database--back-office)  | In progress | ฟอร์มทุก collection พร้อม; รอทดสอบสิทธิ์/ข้อมูลจริงและ reference checks |
| [Phase 3 — Public Explorer](#phase-3--public-explorer)               | In progress | ค้นหา กรอง และ deep link ได้ในโค้ด; รอข้อมูลจริงและตรวจหน้าจอ           |
| [Phase 4 — Interaction & Polish](#phase-4--interaction--polish)      | In progress | focus/relationship และจัดแถว card ในโค้ดแล้ว; รอตรวจภาพและข้อมูลจริง    |
| [Phase 5 — Advanced Lore Features](#phase-5--advanced-lore-features) | In progress | เครื่องมือสำรวจและ JSON backup ในโค้ดพร้อม; รอข้อมูลจริงและตรวจ UI      |

## Phase 1 — Foundation & Timeline Engine

**สถานะ:** Done

- [x] ตั้งค่า React, TypeScript, Vite, Tailwind CSS และธีมสำหรับหน้า public
- [x] สร้าง timeline จาก mock data ที่เลื่อนและซูมได้ พร้อมปุ่มควบคุมแบบไม่ต้องลาก
- [x] แสดง point, range, break ที่ย่อช่วงเวลา, image card และ dialog รายละเอียดเหตุการณ์
- [x] เตรียม Firebase SDK และ optional initializer ที่ไม่ต้องมี credentials เพื่อรัน mock data
- [x] ใส่ค่าจริงใน `.env.local` และตรวจการ initialize กับ Firebase project (ผู้ใช้ยืนยัน)
- [x] ตรวจหน้าจอจริงด้วยตาที่ขนาดมือถือและเดสก์ท็อป รวมถึงการลาก ซูม เปิด/ปิด dialog และ keyboard focus (ผู้ใช้ยืนยัน)

การแทน mock dates, descriptions และภาพตัวอย่างด้วย lore ที่มีแหล่งอ้างอิงติดตามใน Phase 3

## Phase 2 — Database & Back Office

**สถานะ:** In progress

- [x] กำหนด Zod schema สำหรับ timeline, event, character, era, region, source, relationship และ settings โดยแยกความแน่นอนของเวลาออกจาก lore status
- [x] ทำ repository สำหรับ Firestore และ local sandbox เฉพาะ development; Back Office จัดการ record ในทุก collection ผ่านฟอร์มได้
- [x] ทำ overview จำนวน record และปุ่ม save, publish, move to draft, delete พร้อม validation และการยืนยันก่อนลบ
- [x] เตรียม Firebase Authentication แบบ email/password, ตรวจ owner document และ Firestore Rules ที่จำกัดสิทธิ์เขียน
- [x] รองรับการกำหนด breaks และ lane ของ timeline ใน schema และฟอร์ม
- [ ] ทดสอบ Authentication, owner, rules และ CRUD/สิทธิ์ owner กับ Firebase project จริงตาม [คู่มือตั้งค่า](FIREBASE-SETUP.md)
- [x] ทำฟอร์มสำหรับทุก collection รวม event, character, timeline/break, source และตัวเลือก entity ที่เชื่อมกัน แทนการแก้ JSON โดยตรง
- [ ] ตรวจการมีอยู่ของ timeline/source/character/era/region ที่อ้างถึง และจัดการผลกระทบเมื่อลบ record ที่ถูกอ้างอิง
- [ ] ทำ Media Library และการตั้งค่า theme/default viewer ให้ใช้งานจริง; Cloud Storage upload ยังเป็นตัวเลือก
- [ ] ตรวจหน้าจอ Back Office ด้วยตา รวมถึง mobile, keyboard, error state และ Firebase sign-in
- [x] เตรียม public loader ให้ query เฉพาะ `status == published` และแปลงข้อมูลร่วมกับ timeline engine (รอทดสอบ Firestore จริงใน Phase 3)

## Phase 3 — Public Explorer

**สถานะ:** In progress

- [x] ปรับ landing page ให้เข้าสู่ archive และมีทางลัดไปยังยุคสมัย
- [x] เพิ่ม MiniSearch, ตัวกรอง lore certainty และมุมมอง world, character, era/region จากชุด event เดียวกัน
- [x] แสดงข้อมูลตัวละครที่เลือกและเหตุการณ์ที่เชื่อมผ่าน `characterIds` หรือ published relationship
- [x] แยก event ที่ไม่ทราบเวลาออกจากแกนเวลา โดยยังเปิดรายละเอียดได้
- [x] เพิ่ม event deep link ผ่าน query string พร้อมคง search/filter ใน URL และแสดงแหล่งอ้างอิงที่ publish ในรายละเอียด
- [x] เตรียม Firestore public loader ให้ query เฉพาะข้อมูล `published`; ไม่มี Firebase จะใช้ mock data ที่ติดป้ายตัวอย่าง
- [ ] ทดสอบ query, สิทธิ์อ่าน draft/published, แหล่งอ้างอิง และ deep link กับ Firebase project จริง
- [ ] ตรวจหน้า public ด้วยตาที่ 360px และ 1280px รวมถึงผลค้นหาว่าง, event ไม่ทราบเวลา, dialog และการย้อน URL
- [ ] เพิ่มข้อมูล lore และประวัติตัวละครที่มีแหล่งอ้างอิงจริง แทนข้อมูลตัวอย่าง
- [ ] ตรวจคุณภาพการค้นหาภาษาไทยและข้อมูลจำนวนมากเมื่อมีชุดข้อมูลจริง

## Phase 4 — Interaction & Polish

**สถานะ:** In progress

- [x] เพิ่ม focus mode ให้ character timeline แสดงเหตุการณ์อื่นจางลง พร้อม Previous/Next ตามลำดับเวลา
- [x] เน้น event ที่เชื่อมกันด้วยเส้นและรายการลิงก์ในรายละเอียด โดยใช้ published relationship เดียวกัน
- [x] จัดแถว card อัตโนมัติจากตำแหน่งเวลาที่ระดับซูมต่ำสุด เพื่อลดการทับกันโดยไม่ย้ายแถวระหว่างซูม
- [x] เพิ่มการเคลื่อนไหวอย่างจำกัด พร้อมรองรับ `prefers-reduced-motion`
- [x] ลดการอัปเดต React ระหว่าง zoom/pan ด้วย `requestAnimationFrame`; เพิ่มการใช้ Arrow keys, +/− และ Home บน timeline
- [ ] ตรวจหน้าจอและ interaction ในเบราว์เซอร์จริงที่ 360px/1280px รวมถึง focus, hover, keyboard, dialog และ reduced motion (เครื่องมือเบราว์เซอร์ในเซสชันนี้เปิด local tab ไม่สำเร็จ)
- [ ] ทดสอบการจัดแถวและประสิทธิภาพกับข้อมูล Firestore จำนวนมากก่อนสรุป Phase 4 ว่าเสร็จ

## Phase 5 — Advanced Lore Features

**สถานะ:** In progress

- [x] เพิ่ม Relationship Explorer จาก published event links โดยไม่แสดงปลายทางที่ถูก spoiler filter ซ่อน
- [x] เพิ่ม Compare Characters จาก event ชุดเดียวกัน พร้อมแสดงเหตุการณ์ที่มีร่วมกัน
- [x] เพิ่ม Story Mode เดินตามลำดับเวลาของผลลัพธ์ที่มองเห็นและเปิดรายละเอียดเดิมได้
- [x] เพิ่ม `spoilerLevel` (0–3) และ `requiredQuestIds` แบบ optional ใน event schema; public filter คุม event, deep link, ความสัมพันธ์ และ Story Mode โดย URL ไม่ปลด spoiler ให้ผู้รับลิงก์
- [x] เพิ่ม JSON backup สำหรับทุก collection และนำเข้าแบบ add-only ใน local Back Office หลังตรวจ schema ทั้งไฟล์; Firebase ยัง export ได้อย่างเดียว
- [ ] ทดสอบหน้าจอ 360px/1280px และ keyboard flow ของเครื่องมือสำรวจ, spoiler controls, Story Mode และ import/export ด้วยตา
- [ ] ตรวจ UI audit แบบ strict: บันทึกเจ้าของ native select และกำหนด validation ของฟอร์มเข้าสู่ระบบ Back Office (4 รายการจากการตรวจปัจจุบัน)
- [ ] กำหนดชื่อระดับ spoiler และ quest catalog จริงให้สัมพันธ์กับ Archon Quest/Version ก่อนใส่ข้อมูล lore จริง
- [ ] ทดสอบการอ่านข้อมูลที่มี spoiler กับ Firebase จริง รวมถึงสิทธิ์และประสิทธิภาพของข้อมูลจำนวนมาก
- [ ] ถ้าต้องการนำเข้า Firebase หรือเขียนทับข้อมูลเดิม ให้กำหนดนโยบาย conflict, preview และ recovery ก่อนเปิดใช้งาน
