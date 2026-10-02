-- CreateTable
CREATE TABLE "_BookingAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookingAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BookingAssignees_B_index" ON "_BookingAssignees"("B");

-- AddForeignKey
ALTER TABLE "_BookingAssignees" ADD CONSTRAINT "_BookingAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingAssignees" ADD CONSTRAINT "_BookingAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

