import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { addEvent } from '@/lib/nch/server-utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const complaint = await db.complaint.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!complaint) return fail('Complaint not found', 404);

    if (user.role === 'consumer' && complaint.consumerId !== user.id) {
      return fail('Unauthorized to upload documents for this complaint', 403);
    }
    if (user.role === 'company' && complaint.companyId !== user.companyId) {
      return fail('Unauthorized to upload documents for this complaint', 403);
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return fail('No file uploaded or invalid file format', 400);
    }

    if (file.size > 15 * 1024 * 1024) {
      return fail('File size exceeds 15MB limit', 400);
    }

    const ext = path.extname(file.name).toLowerCase() || '.pdf';
    let docType = 'PDF';
    if (['.png'].includes(ext)) docType = 'PNG';
    else if (['.jpg', '.jpeg'].includes(ext)) docType = 'JPG';
    else if (['.webp'].includes(ext)) docType = 'WEBP';
    else if (['.doc', '.docx'].includes(ext)) docType = 'DOC';
    else docType = ext.replace('.', '').toUpperCase() || 'FILE';

    const sizeStr =
      file.size < 1024 * 1024
        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const doc = await db.document.create({
      data: {
        complaintId: id,
        name: file.name,
        type: docType,
        size: sizeStr,
        uploadedBy: user.name,
      },
    });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'complaints');
    await mkdir(uploadDir, { recursive: true });
    const diskFileName = `${doc.id}${ext}`;
    const filePath = path.join(uploadDir, diskFileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const roleLabel =
      user.role === 'consumer'
        ? 'Consumer'
        : user.role === 'company'
        ? 'Organization'
        : user.role === 'supervisor'
        ? 'Supervisor'
        : 'NCH Officer';

    await addEvent({
      complaintId: id,
      type: 'DOCUMENT',
      title: 'Document Uploaded',
      description: `${file.name} (${sizeStr}) uploaded by ${user.name}.`,
      actorName: user.name,
      actorRole: roleLabel,
    });

    const fresh = await db.complaint.findUniqueOrThrow({
      where: { id },
      include: complaintInclude,
    });

    return NextResponse.json({
      document: {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.createdAt.toISOString(),
        url: `/uploads/complaints/${diskFileName}`,
      },
      complaint: serializeComplaint(fresh, {
        includeInternal: user.role === 'officer' || user.role === 'supervisor',
      }),
    });
  } catch (err) {
    return handleError(err);
  }
}
