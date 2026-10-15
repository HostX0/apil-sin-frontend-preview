/**
 * Browser-only synthetic API for the isolated Apil Sin frontend preview.
 * Recovered from the existing preview and restored to readable source.
 * All records are examples. Writes mutate this module's memory only and reset
 * on page reload. This module performs no network calls or external delivery.
 */
import * as shared from '@/lib/ui-shared';
let fixtureIds = {
    owner: '11111111-1111-4111-8111-111111111111',
    office: '22222222-2222-4222-8222-222222222222',
    client: '33333333-3333-4333-8333-333333333333',
    case: '44444444-4444-4444-8444-444444444444',
    account: '55555555-5555-4555-8555-555555555555',
    transaction: '66666666-6666-4666-8666-666666666666',
    consultation: '77777777-7777-4777-8777-777777777777',
    business: '88888888-8888-4888-8888-888888888888',
    walkIn: '99999999-9999-4999-8999-999999999999',
    lawyer: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    task: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    court: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    document: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  },
  nextIdCounter = 100,
  createId = () => 'f0000000-0000-4000-8000-'.concat(String(nextIdCounter++).padStart(12, '0')),
  todayKey = (0, shared.toBaghdadDateKey)(new Date()),
  dateOffset = (e) =>
    new Date(new Date(''.concat(todayKey, 'T12:00:00Z')).getTime() + 864e5 * e)
      .toISOString()
      .slice(0, 10),
  timestamp = () => new Date().toISOString(),
  createdAt = ''.concat(todayKey, 'T08:00:00Z'),
  clone = (e) => JSON.parse(JSON.stringify(e)),
  sumMoney = (e) => e.reduce((e, t) => e + BigInt(t || '0'), 0n).toString(),
  nonNegativeMoney = (e) => (e > 0n ? e : 0n).toString(),
  roles = shared.SYSTEM_ROLES.map((e, t) => ({
    id: 'e0000000-0000-4000-8000-'.concat(String(t + 1).padStart(12, '0')),
    key: e,
    nameAr: shared.SYSTEM_ROLE_AR[e],
    descriptionAr: shared.SYSTEM_ROLE_DESCRIPTION_AR[e],
    permissions: [...shared.SYSTEM_ROLE_PERMISSIONS[e]],
    isSystem: !0,
    userCount: +(t < 3),
    version: 1,
  })),
  previewUser = {
    id: fixtureIds.owner,
    officeId: fixtureIds.office,
    fullName: 'Office Manager',
    email: 'manager@devshub.example',
    officeName: 'DevsHub',
    roleId: roles[0].id,
    roleKey: 'OWNER',
    roleNameAr: 'Office owner',
    permissions: [...shared.PERMISSIONS],
    mustChangePassword: !1,
    preferences: {
      numerals: 'latin',
      showHijri: !1,
    },
    avatarUrl: null,
  },
  officeSettings = clone(shared.DEFAULT_OFFICE_SETTINGS);
officeSettings.localization = {
  numerals: 'latin',
  showHijri: !1,
  density: 'comfortable',
};
let officeProfile = {
    id: fixtureIds.office,
    name: 'DevsHub Legal Office Workspace',
    lawyerName: 'Sample Lawyer',
    address: 'Najaf, Iraq',
    phonePrimary: '+9647700000000',
    phoneSecondary: null,
    email: 'info@devshub.example',
    logoUrl: '/brand/mark-ink.svg',
    stampUrl: null,
    signatureUrl: null,
    createdAt: createdAt,
  },
  accountProfile = {
    id: fixtureIds.owner,
    fullName: previewUser.fullName,
    email: previewUser.email,
    phone: '+9647700000000',
    avatarUrl: null,
    version: 1,
  },
  clients = [
    {
      id: fixtureIds.client,
      kind: 'INDIVIDUAL',
      fullName: 'Sample Client',
      mobile: '+9647700000000',
      nationalId: '100000000001',
      activeCaseCount: 1,
      caseCount: 2,
      isFavorite: !0,
      createdAt: createdAt,
      updatedAt: createdAt,
      address: 'Najaf, Iraq',
      phoneSecondary: null,
      email: 'client@example.com',
      notes: 'Synthetic client for exploring office workflows.',
      tags: [
        {
          id: createId(),
          label: 'Follow-up',
          colorToken: 'blue',
        },
      ],
      version: 1,
    },
    {
      id: fixtureIds.business,
      kind: 'COMPANY',
      fullName: 'Sample Business',
      mobile: '+9647800000000',
      nationalId: 'REG-2026-001',
      activeCaseCount: 1,
      caseCount: 1,
      isFavorite: !1,
      createdAt: createdAt,
      updatedAt: createdAt,
      address: 'Najaf, Iraq',
      phoneSecondary: null,
      email: 'business@example.com',
      notes: 'Company registration and business assistance.',
      tags: [],
      version: 1,
    },
    {
      id: fixtureIds.walkIn,
      kind: 'INDIVIDUAL',
      fullName: 'Walk-in Client',
      mobile: '+9647900000000',
      nationalId: null,
      activeCaseCount: 0,
      caseCount: 0,
      isFavorite: !1,
      createdAt: createdAt,
      updatedAt: createdAt,
      address: null,
      phoneSecondary: null,
      email: null,
      notes: null,
      tags: [],
      version: 1,
    },
  ],
  users = [
    previewUser,
    {
      ...previewUser,
      id: createId(),
      fullName: 'Sample Lawyer',
      email: 'lawyer@devshub.example',
      roleId: roles[1].id,
      roleKey: 'LAWYER',
      roleNameAr: 'Lawyer',
    },
    {
      ...previewUser,
      id: createId(),
      fullName: 'Sample Assistant',
      email: 'assistant@example.com',
      roleId: roles[2].id,
      roleKey: 'ASSISTANT',
      roleNameAr: 'Assistant / clerk',
    },
  ].map((e) => ({
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    phone: '+9647700000000',
    status: 'ACTIVE',
    roleId: e.roleId,
    roleKey: e.roleKey,
    roleNameAr: e.roleNameAr,
    lastLoginAt: createdAt,
    activeSessions: 1,
    mustChangePassword: !1,
    version: 1,
    createdAt: createdAt,
  })),
  lawyers = [
    {
      id: fixtureIds.lawyer,
      fullName: 'Sample Lawyer',
      phone: '+9647700000000',
      email: 'lawyer@devshub.example',
      userId: users[1].id,
      photoUrl: null,
      isActive: !0,
      joinedAt: dateOffset(-60),
      membershipNumber: 'SAMPLE-001',
      assignedCaseCount: 2,
      version: 1,
      notes: 'Civil and business matters.',
      photo: null,
      identity: null,
    },
    {
      id: createId(),
      fullName: 'Sample Associate',
      phone: '+9647800000001',
      email: 'associate@example.com',
      userId: null,
      photoUrl: null,
      isActive: !0,
      joinedAt: dateOffset(-30),
      membershipNumber: 'SAMPLE-002',
      assignedCaseCount: 1,
      version: 1,
      notes: null,
      photo: null,
      identity: null,
    },
  ],
  courts = [
    {
      id: fixtureIds.court,
      name: 'Najaf Civil Court',
      type: 'FIRST_INSTANCE',
      jurisdiction: 'FEDERAL',
      governorate: 'Najaf',
      appealRegion: 'Najaf',
      caseCount: 2,
      version: 1,
      address: 'Najaf, Iraq',
      phone: null,
      notes: 'Sample court directory record.',
    },
    {
      id: createId(),
      name: 'Najaf Personal Status Court',
      type: 'PERSONAL_STATUS',
      jurisdiction: 'FEDERAL',
      governorate: 'Najaf',
      appealRegion: 'Najaf',
      caseCount: 0,
      version: 1,
      address: 'Najaf, Iraq',
      phone: null,
      notes: null,
    },
  ],
  cases = [
    {
      id: fixtureIds.case,
      numberDisplay: '104 / C / 2026',
      serial: 104,
      typeCode: 'C',
      year: 2026,
      caseType: 'CIVIL',
      status: 'HEARING',
      priority: 'NORMAL',
      isFavorite: !0,
      subject: 'Claim for compensation under a sample service agreement',
      clientId: fixtureIds.client,
      clientName: 'Sample Client',
      opponentName: 'Sample Opponent',
      courtId: fixtureIds.court,
      courtName: 'Najaf Civil Court',
      clientRole: 'PLAINTIFF',
      openedAt: dateOffset(-20),
      claimValue: '10000000',
      judgeName: 'Sample Judge',
      chamber: 'Civil chamber 1',
      closedAt: null,
      archivedAt: null,
      nextHearingAt: ''.concat(dateOffset(2), 'T09:30:00+03:00'),
      lastActivityAt: createdAt,
      version: 1,
      parties: [
        {
          id: createId(),
          side: 'CLIENT',
          role: 'PLAINTIFF',
          name: 'Sample Client',
          counselName: 'Sample Lawyer',
          address: 'Najaf, Iraq',
          phone: '+9647700000000',
          clientId: fixtureIds.client,
        },
        {
          id: createId(),
          side: 'OPPONENT',
          role: 'DEFENDANT',
          name: 'Sample Opponent',
          counselName: 'Sample Opposing Counsel',
          address: 'Najaf, Iraq',
          phone: null,
          clientId: null,
        },
      ],
      assignedLawyers: [
        {
          id: fixtureIds.lawyer,
          fullName: 'Sample Lawyer',
          isLead: !0,
        },
        {
          id: lawyers[1].id,
          fullName: 'Sample Associate',
          isLead: !1,
        },
      ],
      powersOfAttorney: [
        {
          id: createId(),
          number: 'POA-104/2026',
          issueDate: dateOffset(-20),
          type: 'SPECIFIC',
          issuer: 'Najaf Notary Office',
          certified: !0,
          certificationDate: dateOffset(-19),
          expiresAt: dateOffset(120),
          isExpired: !1,
          scope: 'Represent the client in this civil case.',
          notes: 'Synthetic certified power of attorney.',
          documentId: fixtureIds.document,
        },
      ],
      statusHistory: [
        {
          id: createId(),
          fromStatus: null,
          toStatus: 'NOTIFICATION',
          effectiveAt: dateOffset(-20),
          reason: 'Case registered and notice prepared.',
          actorLabel: 'Office Manager',
          createdAt: createdAt,
        },
        {
          id: createId(),
          fromStatus: 'NOTIFICATION',
          toStatus: 'HEARING',
          effectiveAt: dateOffset(-10),
          reason: 'Notice served. Hearing scheduled.',
          actorLabel: 'Sample Lawyer',
          createdAt: createdAt,
        },
      ],
      tags: [
        {
          id: createId(),
          label: 'Civil matter',
          colorToken: 'blue',
        },
      ],
      compliance: {
        missingFeeAgreement: !1,
        missingCertifiedPoa: !1,
        outstandingBalance: '1500000',
      },
      counts: {
        hearings: 3,
        documents: 2,
        tasks: 1,
        notes: 1,
      },
    },
  ];
(cases.push({
  ...clone(cases[0]),
  id: fixtureIds.business,
  numberDisplay: '205 / C / 2026',
  serial: 205,
  typeCode: 'C',
  caseType: 'COMMERCIAL',
  status: 'NOTIFICATION',
  subject: 'Business contract review and representation',
  clientId: fixtureIds.business,
  clientName: 'Sample Business',
  opponentName: 'Sample Supplier',
  isFavorite: !1,
  nextHearingAt: null,
  powersOfAttorney: [],
  statusHistory: [],
  parties: [
    {
      ...clone(cases[0].parties[1]),
      id: createId(),
      name: 'Sample Supplier',
    },
  ],
  compliance: {
    missingFeeAgreement: !0,
    missingCertifiedPoa: !0,
    outstandingBalance: null,
  },
  counts: {
    hearings: 0,
    documents: 1,
    tasks: 0,
    notes: 0,
  },
}),
  cases.push({
    ...clone(cases[0]),
    id: fixtureIds.walkIn,
    numberDisplay: '88 / C / 2025',
    serial: 88,
    year: 2025,
    status: 'CLOSED',
    subject: 'Completed sample civil matter',
    isFavorite: !1,
    nextHearingAt: null,
    closedAt: dateOffset(-30),
    powersOfAttorney: [],
    statusHistory: [
      {
        id: createId(),
        fromStatus: 'HEARING',
        toStatus: 'CLOSED',
        effectiveAt: dateOffset(-30),
        reason: 'Matter settled.',
        actorLabel: 'Sample Lawyer',
        createdAt: createdAt,
      },
    ],
    compliance: {
      missingFeeAgreement: !1,
      missingCertifiedPoa: !1,
      outstandingBalance: '0',
    },
    counts: {
      hearings: 0,
      documents: 0,
      tasks: 0,
      notes: 0,
    },
  }));
let hearings = [
  {
    id: createId(),
    caseId: fixtureIds.case,
    caseNumber: cases[0].numberDisplay,
    caseStatus: 'HEARING',
    clientName: 'Sample Client',
    courtId: fixtureIds.court,
    courtName: 'Najaf Civil Court',
    scheduledAt: ''.concat(todayKey, 'T09:30:00+03:00'),
    dateKey: todayKey,
    hasTime: !0,
    status: 'SCHEDULED',
    purpose: 'Review the response and supporting papers',
    attendingLawyer: {
      id: fixtureIds.lawyer,
      fullName: 'Sample Lawyer',
    },
    outcome: null,
    outcomeNotes: null,
    adjournmentReason: null,
    nextHearingId: null,
    nextHearingAt: null,
  },
];
(hearings.push({
  ...clone(hearings[0]),
  id: createId(),
  scheduledAt: ''.concat(dateOffset(2), 'T09:30:00+03:00'),
  dateKey: dateOffset(2),
  purpose: 'Witness testimony',
}),
  hearings.push({
    ...clone(hearings[0]),
    id: createId(),
    scheduledAt: ''.concat(dateOffset(-7), 'T10:00:00+03:00'),
    dateKey: dateOffset(-7),
    status: 'HELD',
    outcome: 'ADJOURNED',
    outcomeNotes: 'Court requested additional documents.',
    adjournmentReason: 'To submit documents',
    nextHearingId: hearings[0].id,
    nextHearingAt: hearings[0].scheduledAt,
  }));
let events = [
    {
      id: createId(),
      title: 'Client consultation',
      type: 'APPOINTMENT',
      date: todayKey,
      time: '11:00',
      endTime: '11:45',
      allDay: !1,
      location: 'DevsHub office',
      notes: 'Review the sample documents and agree on next steps.',
      caseId: fixtureIds.case,
      ownerId: fixtureIds.owner,
      ownerName: 'Office Manager',
      reminderOffsets: [1440, 60],
      recurrence: 'NONE',
      recurrenceEnd: null,
      seriesId: null,
      version: 1,
    },
    {
      id: createId(),
      title: 'Prepare business registration papers',
      type: 'DEADLINE',
      date: dateOffset(3),
      time: null,
      endTime: null,
      allDay: !0,
      location: null,
      notes: 'Submit the completed sample checklist.',
      caseId: fixtureIds.business,
      ownerId: fixtureIds.owner,
      ownerName: 'Office Manager',
      reminderOffsets: [1440],
      recurrence: 'NONE',
      recurrenceEnd: null,
      seriesId: null,
      version: 1,
    },
  ],
  tasks = [
    {
      id: fixtureIds.task,
      title: 'Review company registration documents',
      description: 'Check the sample papers and prepare the office follow-up.',
      status: 'OPEN',
      priority: 'NORMAL',
      dueAt: ''.concat(todayKey, 'T14:00:00+03:00'),
      dateKey: todayKey,
      doneAt: null,
      caseId: fixtureIds.case,
      caseNumber: cases[0].numberDisplay,
      assigneeId: fixtureIds.owner,
      assigneeName: 'Office Manager',
      isOverdue: !1,
      version: 1,
      createdAt: createdAt,
    },
    {
      id: createId(),
      title: 'Confirm the next hearing papers',
      description: 'Collect the sample witness list.',
      status: 'IN_PROGRESS',
      priority: 'IMPORTANT',
      dueAt: ''.concat(dateOffset(-1), 'T12:00:00+03:00'),
      dateKey: dateOffset(-1),
      doneAt: null,
      caseId: fixtureIds.case,
      caseNumber: cases[0].numberDisplay,
      assigneeId: users[1].id,
      assigneeName: 'Sample Lawyer',
      isOverdue: !0,
      version: 1,
      createdAt: createdAt,
    },
    {
      id: createId(),
      title: 'Prepare client meeting',
      description: null,
      status: 'DONE',
      priority: 'NORMAL',
      dueAt: createdAt,
      dateKey: todayKey,
      doneAt: createdAt,
      caseId: null,
      caseNumber: null,
      assigneeId: fixtureIds.owner,
      assigneeName: 'Office Manager',
      isOverdue: !1,
      version: 1,
      createdAt: createdAt,
    },
  ],
  transactions = [
    {
      id: fixtureIds.transaction,
      type: 'Company registration',
      department: 'Companies Registration Department',
      clientId: fixtureIds.business,
      clientName: 'Sample Business',
      assignedLawyerId: fixtureIds.lawyer,
      assignedLawyerName: 'Sample Lawyer',
      addedAt: createdAt,
      createdAt: createdAt,
      status: 'IN_PROGRESS',
      notes: 'Documents submitted. Awaiting department review.',
      version: 1,
      canUpdate: !0,
    },
  ],
  documents = [
    {
      id: fixtureIds.document,
      title: 'Certified power of attorney',
      docType: 'POWER_OF_ATTORNEY',
      fileName: 'sample-power-of-attorney.pdf',
      mimeType: 'application/pdf',
      sizeBytes: '245760',
      pageCount: 2,
      hasThumbnail: !1,
      caseId: fixtureIds.case,
      transactionId: null,
      caseNumber: cases[0].numberDisplay,
      clientId: fixtureIds.client,
      clientName: 'Sample Client',
      issueDate: dateOffset(-20),
      expiryDate: dateOffset(120),
      isExpired: !1,
      versionCount: 1,
      createdAt: createdAt,
      notes: 'Synthetic supporting document. No confidential records.',
      version: 1,
      uploadedBy: 'Office Manager',
      tags: [],
      versions: [
        {
          id: createId(),
          versionNumber: 1,
          fileName: 'sample-power-of-attorney.pdf',
          mimeType: 'application/pdf',
          sizeBytes: '245760',
          pageCount: 2,
          createdAt: createdAt,
          uploadedBy: 'Office Manager',
        },
      ],
    },
  ];
(documents.push({
  ...clone(documents[0]),
  id: createId(),
  title: 'Court notice',
  docType: 'COURT_DOCUMENT',
  fileName: 'sample-court-notice.pdf',
  issueDate: dateOffset(-10),
  expiryDate: null,
  pageCount: 1,
  notes: 'Sample court notice for the civil matter.',
}),
  documents.push({
    ...clone(documents[0]),
    id: createId(),
    title: 'Company registration documents',
    docType: 'OTHER',
    fileName: 'sample-registration-documents.pdf',
    caseId: null,
    transactionId: fixtureIds.transaction,
    caseNumber: null,
    clientId: fixtureIds.business,
    clientName: 'Sample Business',
    sizeBytes: '532480',
    pageCount: 5,
    issueDate: null,
    expiryDate: dateOffset(20),
    versionCount: 2,
    notes: 'Sample business paperwork.',
    versions: [
      clone(documents[0].versions[0]),
      {
        ...clone(documents[0].versions[0]),
        id: createId(),
        versionNumber: 2,
      },
    ],
  }));
let feeAgreements = [
    {
      id: createId(),
      caseId: fixtureIds.case,
      model: 'STAGED',
      totalAmount: '2500000',
      percentageBps: null,
      signedAt: dateOffset(-20),
      notes: 'Representation and preparation of the sample civil matter.',
      version: 1,
      installments: [
        {
          id: createId(),
          sequence: 1,
          label: 'On engagement',
          amount: '1000000',
          dueAt: dateOffset(-20),
        },
        {
          id: createId(),
          sequence: 2,
          label: 'On judgment',
          amount: '1500000',
          dueAt: dateOffset(30),
        },
      ],
    },
  ],
  receipts = [
    {
      id: createId(),
      number: 104,
      numberDisplay: '000104',
      clientId: fixtureIds.client,
      clientName: 'Sample Client',
      caseId: fixtureIds.case,
      caseNumber: cases[0].numberDisplay,
      amount: '2500000',
      paidAmount: '1000000',
      outstanding: '1500000',
      description: 'Agreed civil case fees',
      status: 'ISSUED',
      issuedAt: dateOffset(-20),
      issuedBy: 'Office Manager',
      voidedAt: null,
      voidReason: null,
      correctsInvoiceId: null,
      isCreditNote: !1,
      payments: [
        {
          id: createId(),
          amount: '1000000',
          method: 'CASH',
          paidAt: dateOffset(-10),
          reference: 'SAMPLE-104',
          receivedBy: 'Office Manager',
        },
      ],
    },
  ],
  expenses = [
    {
      id: createId(),
      caseId: fixtureIds.case,
      caseNumber: cases[0].numberDisplay,
      category: 'COURT_FEE',
      amount: '25000',
      spentAt: dateOffset(-10),
      description: 'Sample court registration fees',
      billable: !0,
      paidBy: 'Office Manager',
      version: 1,
    },
    {
      id: createId(),
      caseId: null,
      caseNumber: null,
      category: 'OTHER',
      amount: '50000',
      spentAt: dateOffset(-5),
      description: 'Office supplies',
      billable: !1,
      paidBy: 'Office Manager',
      version: 1,
    },
  ],
  financeAccounts = [
    {
      id: fixtureIds.account,
      title: 'Company registration',
      partyName: null,
      clientId: fixtureIds.business,
      clientName: 'Sample Business',
      transactionId: fixtureIds.transaction,
      transactionType: 'Company registration',
      agreed: '1500000',
      received: '500000',
      remaining: '1000000',
      expenses: '50000',
      billableExpenses: '0',
      version: 1,
      notes: 'Registration and department follow-up.',
      dueAt: dateOffset(30),
      movements: [
        {
          id: createId(),
          kind: 'PAYMENT',
          amount: '500000',
          occurredAt: dateOffset(-7),
          description: 'First payment for company registration',
          method: 'CASH',
          reference: 'SAMPLE-105',
          category: null,
          billable: !1,
          receiptNumber: 105,
          recordedBy: 'Office Manager',
          voidedAt: null,
          voidReason: null,
        },
        {
          id: createId(),
          kind: 'EXPENSE',
          amount: '50000',
          occurredAt: dateOffset(-5),
          description: 'Registration paperwork costs',
          method: null,
          reference: null,
          category: 'OTHER',
          billable: !1,
          receiptNumber: null,
          recordedBy: 'Office Manager',
          voidedAt: null,
          voidReason: null,
        },
      ],
    },
    {
      id: fixtureIds.consultation,
      title: 'Legal consultation',
      partyName: 'Walk-in Client',
      clientId: null,
      clientName: null,
      transactionId: null,
      transactionType: null,
      agreed: '150000',
      received: '150000',
      remaining: '0',
      expenses: '0',
      billableExpenses: '0',
      version: 1,
      notes: 'Completed sample consultation.',
      dueAt: null,
      movements: [
        {
          id: createId(),
          kind: 'PAYMENT',
          amount: '150000',
          occurredAt: dateOffset(-3),
          description: 'Consultation fee',
          method: 'CASH',
          reference: null,
          category: null,
          billable: !1,
          receiptNumber: 106,
          recordedBy: 'Office Manager',
          voidedAt: null,
          voidReason: null,
        },
      ],
    },
  ],
  automationTemplates = shared.WHATSAPP_AUTOMATION_EVENTS.map((e, t) => ({
    id: createId(),
    eventKey: e,
    body: shared.WHATSAPP_AUTOMATION_DEFINITIONS[e].defaultBody,
    enabled: 0 === t,
    welcomeImageEnabled: !0,
    version: 1,
    welcomeImageId: null,
    welcomeUpload:
      0 === t
        ? {
            objectKey: 'reference/welcome/saved/company-welcome.png',
            fileName: 'company-welcome.png',
            mimeType: 'image/png',
            sizeBytes: 1412444,
          }
        : null,
  })),
  whatsappMessages = [
    {
      id: createId(),
      recipientType: 'client',
      recipientId: fixtureIds.client,
      recipientName: 'Sample Client',
      phone: '+9647700000000',
      body: 'Welcome to DevsHub. This is a sample message.',
      kind: 'welcome',
      eventKey: 'client.created',
      automationVersion: 1,
      status: 'delivered',
      lastError: null,
      createdAt: createdAt,
      updatedAt: createdAt,
      attachmentFileName: null,
      welcomeImageId: null,
    },
  ],
  whatsappConnection = {
    configured: !0,
    status: 'disconnected',
    phone: '+9647700000000',
  },
  notifications = [
    {
      id: createId(),
      kind: 'HEARING',
      titleAr: 'Upcoming civil hearing',
      bodyAr: 'Review the sample hearing papers and confirm attendance.',
      link: '/cases/'.concat(fixtureIds.case),
      readAt: null,
      createdAt: createdAt,
    },
    {
      id: createId(),
      kind: 'TASK_DUE',
      titleAr: 'A task needs follow-up',
      bodyAr: 'Confirm the next hearing papers.',
      link: '/tasks',
      readAt: null,
      createdAt: createdAt,
    },
  ],
  notificationPreferences = {
    inApp: !0,
    email: !1,
    push: !1,
    hearingLeadMinutes: [1440, 60],
  },
  sessions = [
    {
      id: createId(),
      deviceLabel: 'Current preview browser',
      ip: '127.0.0.1',
      lastUsedAt: createdAt,
      createdAt: createdAt,
      expiresAt: ''.concat(dateOffset(7), 'T08:00:00Z'),
      current: !0,
    },
  ],
  savedSearches = [
    {
      id: createId(),
      name: 'Active civil cases',
      scope: 'CASES',
      query: 'activeOnly=true&caseType=CIVIL',
      isShared: !0,
      isMine: !0,
      ownerId: fixtureIds.owner,
      ownerName: 'Office Manager',
      canDelete: !0,
      createdAt: createdAt,
    },
  ],
  mailboxes = [
    {
      email: 'info@devshub.example',
      name: 'DevsHub Legal Office Workspace',
      protected: !0,
      createdAt: null,
    },
    {
      email: 'sample.lawyer@devshub.example',
      name: 'Sample Lawyer',
      protected: !1,
      createdAt: createdAt,
    },
  ],
  backups = [
    {
      id: createId(),
      objectKey: 'sample-office-backup.zip',
      sizeBytes: 245760,
      createdAt: createdAt,
      createdBy: 'Office Manager',
      counts: {
        clients: 3,
        cases: 3,
        documents: 3,
        tasks: 3,
      },
    },
  ],
  auditEntries = [
    {
      id: createId(),
      action: 'CREATE',
      entityType: 'Case',
      entityId: fixtureIds.case,
      summaryAr: 'Registered the sample civil case.',
      actorId: fixtureIds.owner,
      actorLabel: 'Office Manager',
      ip: '127.0.0.1',
      changes: [
        {
          field: 'subject',
          before: null,
          after: cases[0].subject,
        },
      ],
      createdAt: createdAt,
    },
  ],
  idempotencyResults = new Map();
function clientFor(e) {
  var t;
  return null != (t = clients.find((t) => t.id === e)) ? t : clients[0];
}
function caseFor(e) {
  var t;
  return null != (t = cases.find((t) => t.id === e)) ? t : cases[0];
}
function paginate(e) {
  let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
    a = Number(t.cursor || 0),
    n = Math.max(1, Number(t.limit || 25));
  return {
    items: e.slice(a, a + n),
    nextCursor: a + n < e.length ? String(a + n) : null,
  };
}
let isTrue = (e) => !0 === e || 'true' === e;
function matchesQuery(e, t) {
  return !t || JSON.stringify(e).toLowerCase().includes(String(t).trim().toLowerCase());
}
function caseFeeSummary() {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : fixtureIds.case,
    t = caseFor(e),
    a = feeAgreements.filter((e) => e.caseId === t.id),
    n = receipts.filter((e) => e.caseId === t.id && 'ISSUED' === e.status),
    r = sumMoney(a.map((e) => e.totalAmount)),
    o = sumMoney(n.flatMap((e) => e.payments.map((e) => e.amount))),
    s = BigInt(r) - BigInt(o),
    l = a[0];
  return {
    caseId: t.id,
    caseNumber: t.numberDisplay,
    clientName: t.clientName,
    agreed: r,
    received: o,
    remaining: nonNegativeMoney(s),
    overpaid: nonNegativeMoney(-s),
    hasAgreement: a.length > 0,
    hasUnpricedAgreement: a.some((e) => !e.totalAmount),
    editableAgreement: l
      ? {
          id: l.id,
          version: l.version,
        }
      : null,
    payments: n.flatMap((e) =>
      e.payments.map((t) => ({
        ...t,
        invoiceId: e.id,
        receiptNumber: e.number,
        notes: e.description,
      })),
    ),
  };
}
function balanceSummary(e, t) {
  let a = receipts.filter(
      (a) => 'ISSUED' === a.status && (!e || a.clientId === e) && (!t || a.caseId === t),
    ),
    n = expenses.filter((e) => !t || e.caseId === t),
    i = sumMoney(a.map((e) => e.amount)),
    r = sumMoney(a.map((e) => e.paidAmount));
  return {
    invoiced: i,
    paid: r,
    outstanding: (BigInt(i) - BigInt(r)).toString(),
    expenses: sumMoney(n.map((e) => e.amount)),
    billableExpenses: sumMoney(n.filter((e) => e.billable).map((e) => e.amount)),
    receiptCount: a.length,
  };
}
function refreshAccount(e) {
  let t = e.movements.filter((e) => !e.voidedAt);
  return (
    (e.received = sumMoney(t.filter((e) => 'PAYMENT' === e.kind).map((e) => e.amount))),
    (e.expenses = sumMoney(t.filter((e) => 'EXPENSE' === e.kind).map((e) => e.amount))),
    (e.billableExpenses = sumMoney(
      t.filter((e) => 'EXPENSE' === e.kind && e.billable).map((e) => e.amount),
    )),
    (e.remaining = nonNegativeMoney(BigInt(e.agreed) - BigInt(e.received))),
    e
  );
}
function workspaceFinanceSummary() {
  let e = cases.map((e) => caseFeeSummary(e.id)),
    t = sumMoney([...e.map((e) => e.agreed), ...financeAccounts.map((e) => e.agreed)]),
    a = sumMoney([...e.map((e) => e.received), ...financeAccounts.map((e) => e.received)]),
    n = sumMoney([...expenses.map((e) => e.amount), ...financeAccounts.map((e) => e.expenses)]);
  return {
    agreed: t,
    received: a,
    remaining: sumMoney([...e.map((e) => e.remaining), ...financeAccounts.map((e) => e.remaining)]),
    expenses: n,
    billableExpenses: sumMoney([
      ...expenses.filter((e) => e.billable).map((e) => e.amount),
      ...financeAccounts.map((e) => e.billableExpenses),
    ]),
    netReceived: (BigInt(a) - BigInt(n)).toString(),
    legacyUnlinked: {
      agreed: '0',
      received: '0',
      remaining: '0',
    },
  };
}
function calendarEntries() {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
  return [
    ...hearings
      .filter((e) => 'CANCELLED' !== e.status)
      .map((e) => ({
        id: e.id,
        source: 'HEARING',
        type: 'HEARING',
        dateKey: e.dateKey,
        time: e.hasTime ? e.scheduledAt.slice(11, 16) : null,
        title: 'Civil hearing — '.concat(e.caseNumber),
        subtitle: ''.concat(e.clientName, ' \xb7 ').concat(e.courtName),
        caseId: e.caseId,
        caseNumber: e.caseNumber,
        href: '/cases/'.concat(e.caseId),
        isDone: 'HELD' === e.status,
      })),
    ...events.map((e) => ({
      id: e.id,
      source: 'EVENT',
      type: e.type,
      dateKey: e.date,
      time: e.time,
      title: e.title,
      subtitle: e.location,
      caseId: e.caseId,
      caseNumber: e.caseId ? caseFor(e.caseId).numberDisplay : null,
      href: '/calendar',
      isDone: !1,
    })),
    ...tasks
      .filter((e) => e.dateKey && 'CANCELLED' !== e.status)
      .map((e) => {
        var t, a;
        return {
          id: e.id,
          source: 'TASK',
          type: 'DEADLINE',
          dateKey: e.dateKey,
          time: null != (a = null == (t = e.dueAt) ? void 0 : t.slice(11, 16)) ? a : null,
          title: e.title,
          subtitle: e.assigneeName,
          caseId: e.caseId,
          caseNumber: e.caseNumber,
          href: '/tasks',
          isDone: 'DONE' === e.status,
        };
      }),
  ]
    .filter(
      (t) =>
        (!e.from || t.dateKey >= String(e.from)) &&
        (!e.to || t.dateKey <= String(e.to)) &&
        (!e.caseId || t.caseId === e.caseId),
    )
    .sort((e, t) => {
      var a, n;
      return ''
        .concat(e.dateKey)
        .concat(null != (a = e.time) ? a : '')
        .localeCompare(''.concat(t.dateKey).concat(null != (n = t.time) ? n : ''));
    });
}
function createHearing(e) {
  var t, a, n, r, l, d, c, u;
  let m = caseFor(e.caseId);
  return {
    id: createId(),
    caseId: m.id,
    caseNumber: m.numberDisplay,
    caseStatus: m.status,
    clientName: m.clientName,
    courtId: null != (a = e.courtId) ? a : m.courtId,
    courtName: m.courtName,
    scheduledAt: ''
      .concat(null != (n = e.date) ? n : todayKey, 'T')
      .concat(null != (r = e.time) ? r : '00:00', ':00+03:00'),
    dateKey: null != (l = e.date) ? l : todayKey,
    hasTime: !!e.time,
    status: 'SCHEDULED',
    purpose: null != (d = e.purpose) ? d : null,
    attendingLawyer: {
      id: null != (c = e.attendingLawyerId) ? c : fixtureIds.lawyer,
      fullName:
        null !=
        (u = null == (t = lawyers.find((t) => t.id === e.attendingLawyerId)) ? void 0 : t.fullName)
          ? u
          : 'Sample Lawyer',
    },
    outcome: null,
    outcomeNotes: null,
    adjournmentReason: null,
    nextHearingId: null,
    nextHearingAt: null,
  };
}
function createReceipt(e) {
  var t, a, n, r, l, d;
  return {
    id: createId(),
    number: 100 + receipts.length + financeAccounts.flatMap((e) => e.movements).length,
    numberDisplay: String(
      100 + receipts.length + financeAccounts.flatMap((e) => e.movements).length,
    ).padStart(6, '0'),
    clientId: null != (t = e.clientId) ? t : fixtureIds.client,
    clientName: clientFor(e.clientId).fullName,
    caseId: null != (a = e.caseId) ? a : null,
    caseNumber: e.caseId ? caseFor(e.caseId).numberDisplay : null,
    amount: String(null != (n = e.amount) ? n : '0'),
    paidAmount: '0',
    outstanding: String(null != (r = e.amount) ? r : '0'),
    description: null != (l = e.description) ? l : 'Sample payment receipt',
    status: 'ISSUED',
    issuedAt: null != (d = e.issuedAt) ? d : todayKey,
    issuedBy: 'Office Manager',
    voidedAt: null,
    voidReason: null,
    correctsInvoiceId: null,
    isCreditNote: !1,
    payments: [],
  };
}
function recordPayment(e, t) {
  var a, n, i;
  let r = {
    id: createId(),
    amount: String(t.amount),
    method: null != (a = t.method) ? a : 'CASH',
    paidAt: null != (n = t.paidAt) ? n : todayKey,
    reference: null != (i = t.reference) ? i : null,
    receivedBy: 'Office Manager',
  };
  return (
    e.payments.push(r),
    (e.paidAmount = sumMoney(e.payments.map((e) => e.amount))),
    (e.outstanding = (BigInt(e.amount) - BigInt(e.paidAmount)).toString()),
    r
  );
}
function previewRequest(e) {
  var t, a;
  let p = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
    en = (null != (t = p.method) ? t : 'GET').toUpperCase(),
    ei = null != (a = p.query) ? a : {};
  if ('GET' === en)
    return clone(
      (function (e, t) {
        let a = e.split('/').filter(Boolean),
          r = a[1];
        if ('/auth/me' === e || '/account' === e) return previewUser;
        if ('/auth/profile' === e) return accountProfile;
        if ('/auth/sessions' === e) return sessions;
        if ('/office/settings' === e) return officeSettings;
        if ('/office' === e) return officeProfile;
        if ('/clients/check-duplicate' === e)
          return clients
            .filter(
              (e) =>
                e.id !== t.excludeId &&
                ((t.mobile &&
                  e.mobile.replace(/\D/g, '') === String(t.mobile).replace(/\D/g, '')) ||
                  (t.nationalId && e.nationalId === t.nationalId)),
            )
            .map((e) => ({
              id: e.id,
              fullName: e.fullName,
              mobile: e.mobile,
              matchedOn: [e.nationalId === t.nationalId ? 'nationalId' : 'mobile'],
            }));
        if ('/clients' === e)
          return paginate(
            clients.filter(
              (e) =>
                matchesQuery(e, t.search) &&
                (!t.kind || e.kind === t.kind) &&
                (!isTrue(t.isFavorite) || e.isFavorite),
            ),
            t,
          );
        if ('clients' === a[0])
          return 'activity' === a[2]
            ? [
                {
                  id: createId(),
                  action: 'CREATE',
                  summaryAr: 'Sample client file created.',
                  actorLabel: 'Office Manager',
                  createdAt: createdAt,
                },
                {
                  id: createId(),
                  action: 'UPDATE',
                  summaryAr: 'Documents and follow-up details reviewed.',
                  actorLabel: 'Sample Lawyer',
                  createdAt: createdAt,
                },
              ]
            : 'fees' === a[2]
              ? cases.filter((e) => e.clientId === r).map((e) => caseFeeSummary(e.id))
              : 'balance' === a[2]
                ? balanceSummary(r)
                : clientFor(r);
        if ('/cases' === e)
          return paginate(
            cases.filter(
              (e) =>
                matchesQuery(e, t.search) &&
                (!t.clientId || e.clientId === t.clientId) &&
                (!t.courtId || e.courtId === t.courtId) &&
                (!t.status || String(t.status).split(',').includes(e.status)) &&
                (!t.caseType || String(t.caseType).split(',').includes(e.caseType)) &&
                (!isTrue(t.isFavorite) || e.isFavorite) &&
                (!isTrue(t.activeOnly) || !['CLOSED', 'ARCHIVED'].includes(e.status)),
            ),
            t,
          );
        if ('cases' === a[0]) {
          if ('fees' === a[2]) return caseFeeSummary(r);
          if ('balance' === a[2]) return balanceSummary(void 0, r);
          if ('transitions' === a[2])
            return shared.CASE_TRANSITIONS.filter((e) => e.from === caseFor(r).status).map((e) => {
              var t;
              return {
                to: e.to,
                toAr: shared.CASE_STATUS_AR[e.to],
                triggerAr: e.triggerAr,
                requires: [...e.requires],
                warnings: [...(null != (t = e.warnings) ? t : [])],
              };
            });
          if ('status-history' === a[2]) return caseFor(r).statusHistory;
          if ('hearings' === a[2]) return hearings.filter((e) => e.caseId === r);
          if ('fee-agreements' === a[2]) return feeAgreements.filter((e) => e.caseId === r);
          let e = caseFor(r);
          return (
            (e.counts.hearings = hearings.filter((t) => t.caseId === e.id).length),
            (e.counts.documents = documents.filter((t) => t.caseId === e.id).length),
            (e.compliance.outstandingBalance = caseFeeSummary(e.id).remaining),
            e
          );
        }
        if ('/hearings' === e) return hearings;
        if ('hearings' === a[0])
          return null != (d = hearings.find((e) => e.id === r)) ? d : hearings[0];
        if ('/calendar' === e) return calendarEntries(t);
        if ('events' === a[0]) return null != (u = events.find((e) => e.id === r)) ? u : events[0];
        if ('/courts' === e)
          return courts.filter(
            (e) =>
              matchesQuery(e, t.search) &&
              (!t.governorate || e.governorate === t.governorate) &&
              (!t.type || e.type === t.type),
          );
        if ('courts' === a[0]) return null != (p = courts.find((e) => e.id === r)) ? p : courts[0];
        if ('/lawyers' === e)
          return lawyers.filter(
            (e) => matchesQuery(e, t.search) && (isTrue(t.includeInactive) || e.isActive),
          );
        if ('lawyers' === a[0])
          return null != (G = lawyers.find((e) => e.id === r)) ? G : lawyers[0];
        if ('/transactions' === e)
          return paginate(
            transactions.filter(
              (e) =>
                matchesQuery(e, t.search) &&
                (!t.status || e.status === t.status) &&
                (!t.clientId || e.clientId === t.clientId),
            ),
            t,
          );
        if ('transactions' === a[0])
          return null != (X = transactions.find((e) => e.id === r)) ? X : transactions[0];
        if ('/documents' === e)
          return paginate(
            documents.filter(
              (e) =>
                matchesQuery(e, t.search) &&
                (!t.caseId || e.caseId === t.caseId) &&
                (!t.clientId || e.clientId === t.clientId) &&
                (!t.transactionId || e.transactionId === t.transactionId) &&
                (!t.docType || e.docType === t.docType) &&
                (!t.expiringWithinDays ||
                  !!(e.expiryDate && e.expiryDate <= dateOffset(Number(t.expiringWithinDays)))),
            ),
            t,
          );
        if ('documents' === a[0])
          return null != (ee = documents.find((e) => e.id === r)) ? ee : documents[0];
        if ('/finance/case-fees' === e) return cases.map((e) => caseFeeSummary(e.id));
        if ('/finance/accounts' === e)
          return financeAccounts.filter(
            (e) =>
              (!t.clientId || e.clientId === t.clientId) &&
              (!t.transactionId || e.transactionId === t.transactionId),
          );
        if ('finance' === a[0] && 'accounts' === a[1])
          return null != (et = financeAccounts.find((e) => e.id === a[2]))
            ? et
            : financeAccounts[0];
        if ('/finance/workspace-summary' === e) return workspaceFinanceSummary();
        if ('/finance/activity' === e) {
          var d, u, p, G, X, ee, et, ea, en;
          let e = [
              ...receipts
                .filter((e) => 'ISSUED' === e.status)
                .flatMap((e) =>
                  e.payments.map((t) => {
                    var a;
                    return {
                      id: t.id,
                      kind: 'PAYMENT',
                      amount: t.amount,
                      occurredAt: t.paidAt,
                      description: e.description,
                      partyName: e.clientName,
                      contextLabel: null != (a = e.caseNumber) ? a : 'Client receipt',
                      accountId: null,
                      caseId: e.caseId,
                      movementId: null,
                      invoiceId: e.id,
                      billable: !1,
                    };
                  }),
                ),
              ...expenses.map((e) => {
                var t;
                return {
                  id: e.id,
                  kind: 'EXPENSE',
                  amount: e.amount,
                  occurredAt: e.spentAt,
                  description: e.description,
                  partyName: null,
                  contextLabel: null != (t = e.caseNumber) ? t : 'Office expense',
                  accountId: null,
                  caseId: e.caseId,
                  movementId: null,
                  invoiceId: null,
                  billable: e.billable,
                };
              }),
              ...financeAccounts.flatMap((e) =>
                e.movements
                  .filter((e) => !e.voidedAt)
                  .map((t) => {
                    var a;
                    return {
                      id: t.id,
                      kind: t.kind,
                      amount: t.amount,
                      occurredAt: t.occurredAt,
                      description: t.description,
                      partyName: null != (a = e.clientName) ? a : e.partyName,
                      contextLabel: e.title,
                      accountId: e.id,
                      caseId: null,
                      movementId: t.id,
                      invoiceId: null,
                      billable: t.billable,
                    };
                  }),
              ),
            ].filter(
              (e) =>
                (!t.from || e.occurredAt.slice(0, 10) >= String(t.from)) &&
                (!t.to || e.occurredAt.slice(0, 10) <= String(t.to)),
            ),
            a = sumMoney(e.filter((e) => 'PAYMENT' === e.kind).map((e) => e.amount)),
            n = sumMoney(e.filter((e) => 'EXPENSE' === e.kind).map((e) => e.amount));
          return {
            received: a,
            expenses: n,
            netReceived: (BigInt(a) - BigInt(n)).toString(),
            items: e,
          };
        }
        if ('/finance/summary' === e)
          return {
            ...balanceSummary(),
            topOutstandingClients: clients
              .map((e) => ({
                clientId: e.id,
                clientName: e.fullName,
                outstanding: balanceSummary(e.id).outstanding,
              }))
              .filter((e) => BigInt(e.outstanding) > 0n),
            expensesByCategory: ['COURT_FEE', 'OTHER'].map((e) => ({
              category: e,
              total: sumMoney(expenses.filter((t) => t.category === e).map((e) => e.amount)),
            })),
          };
        if ('/receipts' === e)
          return paginate(
            receipts.filter(
              (e) =>
                (!t.clientId || e.clientId === t.clientId) &&
                (!t.caseId || e.caseId === t.caseId) &&
                (isTrue(t.includeVoided) || 'VOIDED' !== e.status) &&
                (!isTrue(t.outstandingOnly) || BigInt(e.outstanding) > 0n),
            ),
            t,
          );
        if ('receipts' === a[0])
          return null != (ea = receipts.find((e) => e.id === r)) ? ea : receipts[0];
        if ('/expenses' === e)
          return paginate(
            expenses.filter(
              (e) =>
                (!t.caseId || e.caseId === t.caseId) &&
                (!t.category || e.category === t.category) &&
                (!isTrue(t.billableOnly) || e.billable),
            ),
            t,
          );
        if ('/roles' === e) return roles;
        if ('/users' === e)
          return paginate(
            users.filter(
              (e) =>
                matchesQuery(e, t.q) &&
                (!t.status || e.status === t.status) &&
                (!t.roleId || e.roleId === t.roleId),
            ),
            t,
          );
        if ('/saved-searches' === e)
          return savedSearches.filter((e) => !t.scope || e.scope === t.scope);
        if ('/tasks/counts' === e) {
          let e = tasks.filter((e) => !['DONE', 'CANCELLED'].includes(e.status));
          return {
            open: e.length,
            overdue: e.filter((e) => e.isOverdue).length,
            dueToday: e.filter((e) => e.dateKey === todayKey).length,
            mine: e.filter((e) => e.assigneeId === fixtureIds.owner).length,
          };
        }
        if ('/tasks' === e)
          return paginate(
            tasks.filter(
              (e) =>
                matchesQuery(e, t.q) &&
                (!t.status || e.status === t.status) &&
                (!t.caseId || e.caseId === t.caseId) &&
                (!t.priority || e.priority === t.priority) &&
                (!t.assigneeId || e.assigneeId === t.assigneeId) &&
                (!isTrue(t.mine) || e.assigneeId === fixtureIds.owner) &&
                (!t.dueBefore || (e.dateKey && e.dateKey <= String(t.dueBefore))) &&
                (isTrue(t.includeClosed) || t.status || !['DONE', 'CANCELLED'].includes(e.status)),
            ),
            t,
          );
        if ('/whatsapp/connection' === e) return whatsappConnection;
        if ('/whatsapp/connection/qr' === e)
          return {
            qrCode:
              'qr_ready' === whatsappConnection.status
                ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAH2klEQVR4nO3dS47lNgxA0ewlW8g8+19VMi30e3ZJMkXT5rmoQcGWSOpzYbUBV//1H9CYv+4uALgTAqA1BEBrCIDWEACtIQBaQwC0hgBoDQHQGgKgNQRAa8IE+Pvff/74GbkVTngZmQHDefRs5EwUAQoFDOfRs0GAEmUQ4FkBZyFAoYDhPHo2CFCiDAI8K+AsBCgUMJxHz8bDBACeCAHQmpuPQOGPufAyMs85RcoID1h5XATYUuH7NsqmMm4fFwG2VPi+jbKpjNvHRYAtFb5vo2wq4/ZxEWBLhe/bKJvKuH1cBNhS4fs2yqYybh+X16BoDQHQmgwBbn/M/Row8xkdPq5wKp9YwiHA+q3wXEUgQDBFZo0AgxAgmCKzRoBBCBBMkVkjwCAECKbIrBFgEAIAXSAAWjMnQOazLPPEEl5GkVxFzm+VD04E2FJGkVwE+BUCbCmjSC4C/AoBtpRRJBcBfoUAW8ookosAv0KALWUUyUWAX/EaFK0hAFqT8UlkOPWf0UUChucKv3U7BNjSq0jA8FwEOIQABCAAAWoFDM9FgEMIQAACEKBWwPBcBABeBQHQmroCFDnMhPdaC1jkWFL/aDcLAbJ7rQUkwCYIkN1rLSABNkGA7F5rAQmwCQJk91oLSIBNECC711pAAmyirgBAAgRAax75XyRlnj3CA5qNdx6BLPlgQLNBAEtuNnblmoUA2QHNBgEsudnYlWsWAmQHNBvvFAB4IgRAa8L+NOJbH99FePS4iuyNrxDgGTx6XEX2xlcI8AwePa4ie+MrBHgGjx5Xkb3xFQI8g0ePq8je+AoBnsGjx1Vkb3zFa1C0hgBozc0ChD8cM48Kmee3+rnqV/gVAqzz0CXflKt+hV8hwDoPXfJNuepX+BUCrPPQJd+Uq36FXyHAOg9d8k256lf4FQKs89Al35SrfoVf8RoUrSEAWlP3v0gq8kitfx4ID5g55MxF+QoB1m8VKT48IAFWeOuSE4AAQ7x1yQlAgCHeuuQEIMAQb11yAhAAeC0EQGvCPolc6xX+ZM8so8jpKLPCIiex245A9Sc0swwCEKDchGaWQQAClJvQzDIIQIByE5pZBgEIUG5CM8sgQDsBgJdBALTmbUegIueccMKPCpkTlbnKsxBgPWAmBBjMNQsB1gNmQoDBXLMQYD1gJgQYzDULAdYDZkKAwVyzEGA9YCYEGMw1i9egaA0B0JqbP4kscgTKfHyHFx+eK5zKxRNg/VY4BMgPSID1W+EQID8gAdZvhUOA/IAEWL8VDgHyAxJg/VY4BMgP6DUoWkMAtOZtAtQ/U2VSpPgix+OvEGA9IAGulxHeaxYCrAckwPUywnvNQoD1gAS4XkZ4r1kIsB6QANfLCO81CwHWAxLgehnhvWZ5mwDAFARAazIEKPJIrR8w/MTy6DJyIEChgEV2XpEyciBAoYBFdl6RMnIgQKGARXZekTJyIEChgEV2XpEyciBAoYBFdl6RMnLwGhStIQBac/OfRszsVeRBnHliCa8ws4ycXATIhgDXIcBKLwJcrzCzjJxcBMiGANchwEovAlyvMLOMnFwEyIYA17lNAOBlEACtuVmAt54H1gJmnvremmsWAhQK+NZNSYBDCNBhUxLgEAJ02JQEOIQAHTYlAQ4hQIdNSQCgKARAa27+JDLnMVeqwsxxrZXx6GPkLATIrpAApQISILtCApQKSIDsCglQKiABsiskQKmABMiukAClAnoNitYQAK0hAFpDALSGAGgNAdAaAqA1BEBrCIDWEACtIQBaQwC0hgBoDQHQGgKgNQRAawiA1hAArSEAWkMAtIYAaA0B0BoCoDUEQGsIgNYQAK0hAFpDALSGAGhNvACff7n386/4jrQ5b5mT6/Pu0Xivx5nl+uydt/mcw/OxR63F+DyHQICzXJ93j8Z7Pc4sBAhhlwDX20fFuZLraPHO24zE+W00v3Ml12w9V+Zt5HpU3wUIMHqdAPuuR/VdgACj1wmw73pU3wUIMHqdAPuuR/VdIO8fweftx6/PxrmS62ijnP9+PgOxApzPc2yboxpmr4/n2jFvf0CA0esEOKph9noLAa63ryzAzysji7RPgPE2V+Y5VoC1mgkQkJcA1+PsuD5SMwEC8nYWYPzKSLTzXgQgwEScNQgQwj0C/Nw6nz8jLcfzXsk1Hn+2zfi4jogSfraeK/M8uxbjI12GAGctx+PPtiHAawUAHgQB0BoCoDUEQGsIgNYQAK0hAFpDALSGAGgNAdAaAqA1BEBrCIDWEACtIQBaQwC0hgBoDQHQmroCjH+St/ZR5dqHdlGfceZ8fjmea62ekThbP2i8DgFWqiLA+MwQYJGRxRjfBOfXx+vZ1+ZzXCNjvz4/V9qMjKs4BJirZ18bAtwCAebq2deGALdAgLl69rUhwC1UF2D896O+I9dnqxrZfOMRPqPF/j6Sa9+4znvdDgFWqiLA+LjOe93OMwT4eeVeAc5jjm+U2TgjY1+bnyttRsZVHAJE1kmA8zYFIUBknQQ4b1MQAkTWSYDzNgV5kgBH138u/PkyXFmkzyznFR613L0p19qcj+uozUic4mIQYK4eAhAAeA8EQGsIgNYQAK0hAFpDALSGAGgNAdAaAqA1BEBrCIDWEACtIQBaQwC0hgBoDQHQGgKgNQRAawiA1hAArSEAWkMAtIYAaA0B0BoCoDUEQGsIgNb8D2dsOwGOUZ14AAAAAElFTkSuQmCC'
                : null,
            status: whatsappConnection.status,
          };
        if ('/whatsapp/automations' === e) return automationTemplates;
        if ('/whatsapp/automations/client.created/image' === e)
          return {
            url: '/images/welcome/devshub-welcome-1.svg',
            expiresIn: 3600,
          };
        if ('/whatsapp/messages' === e)
          return whatsappMessages.filter(
            (e) =>
              (!t.recipientId || e.recipientId === t.recipientId) &&
              (!t.recipientType || e.recipientType === t.recipientType),
          );
        if ('/mailboxes' === e)
          return {
            domain: 'devshub.example',
            webmailUrl: '/preview-unavailable/webmail',
            mailboxes: mailboxes,
          };
        if ('/notifications/unread-count' === e)
          return {
            count: notifications.filter((e) => !e.readAt).length,
          };
        if ('/notifications/preferences' === e) return notificationPreferences;
        if ('/notifications' === e)
          return paginate(
            notifications.filter((e) => !isTrue(t.unreadOnly) || !e.readAt),
            t,
          );
        if ('/audit/actors' === e)
          return users.map((e) => ({
            id: e.id,
            label: e.fullName,
          }));
        if ('/audit' === e)
          return paginate(
            auditEntries.filter(
              (e) =>
                (!t.action || e.action === t.action) &&
                (!t.entityType || e.entityType === t.entityType) &&
                (!t.actorId || e.actorId === t.actorId),
            ),
            t,
          );
        if ('/data/backups' === e) return backups;
        if ('/monitoring/counts' === e)
          return {
            NO_FEE_AGREEMENT: 1,
            NO_CERTIFIED_POA: 1,
            OUTSTANDING_FEES: 1,
            INACTIVE_CASES: 0,
            total: 3,
          };
        if ('/monitoring/list' === e)
          return paginate(
            cases
              .filter((e) =>
                'NO_FEE_AGREEMENT' === t.list
                  ? e.compliance.missingFeeAgreement
                  : 'NO_CERTIFIED_POA' === t.list
                    ? e.compliance.missingCertifiedPoa
                    : 'OUTSTANDING_FEES' === t.list && BigInt(caseFeeSummary(e.id).remaining) > 0n,
              )
              .map((e) => ({
                caseId: e.id,
                numberDisplay: e.numberDisplay,
                clientName: e.clientName,
                subject: e.subject,
                courtName: e.courtName,
                detail:
                  'OUTSTANDING_FEES' === t.list
                    ? caseFeeSummary(e.id).remaining
                    : 'Needs follow-up',
                href: '/cases/'.concat(e.id),
              })),
            t,
          );
        if ('/monitoring/statistics' === e)
          return {
            cases: {
              total: cases.length,
              active: cases.filter((e) => !['CLOSED', 'ARCHIVED'].includes(e.status)).length,
              closed: cases.filter((e) => 'CLOSED' === e.status).length,
              archived: cases.filter((e) => 'ARCHIVED' === e.status).length,
              byType: ['CIVIL', 'COMMERCIAL'].map((e) => ({
                label: 'CIVIL' === e ? 'Civil' : 'Commercial',
                count: cases.filter((t) => t.caseType === e).length,
              })),
              byStatus: ['HEARING', 'NOTIFICATION', 'CLOSED'].map((e) => ({
                label: shared.CASE_STATUS_AR[e],
                count: cases.filter((t) => t.status === e).length,
              })),
            },
            clients: {
              total: clients.length,
              withActiveCases: 2,
            },
            hearings: {
              upcoming30Days: hearings.filter((e) => 'SCHEDULED' === e.status).length,
              heldLast30Days: hearings.filter((e) => 'HELD' === e.status).length,
            },
            documents: {
              total: documents.length,
              expiringSoon: 1,
            },
            finance: {
              ...workspaceFinanceSummary(),
              invoiced: balanceSummary().invoiced,
              paid: workspaceFinanceSummary().received,
              outstanding: workspaceFinanceSummary().remaining,
            },
            watchlists: {
              NO_FEE_AGREEMENT: 1,
              NO_CERTIFIED_POA: 1,
              OUTSTANDING_FEES: 1,
              INACTIVE_CASES: 0,
              total: 3,
            },
          };
        if ('/dashboard/today' === e)
          return {
            todayKey: todayKey,
            weekRange: {
              from: dateOffset(-3),
              to: dateOffset(3),
            },
            metrics: {
              activeCases: cases.filter((e) => !['CLOSED', 'ARCHIVED'].includes(e.status)).length,
              weekHearings: hearings.filter((e) => 'SCHEDULED' === e.status).length,
              outstandingFees: workspaceFinanceSummary().remaining,
            },
            isEmptyOffice: !1,
            schedule: calendarEntries({
              from: todayKey,
              to: todayKey,
            }).map((e) => {
              let { dateKey: t, caseId: a, caseNumber: n, ...i } = e;
              return i;
            }),
          };
        if ('/search' === e) {
          let e = [
            {
              group: 'CLIENTS',
              items: clients.map((e) => ({
                id: e.id,
                title: e.fullName,
                subtitle: e.mobile,
                href: '/clients/'.concat(e.id),
              })),
            },
            {
              group: 'CASES',
              items: cases.map((e) => ({
                id: e.id,
                title: e.numberDisplay,
                subtitle: ''.concat(e.clientName, ' \xb7 ').concat(e.subject),
                href: '/cases/'.concat(e.id),
              })),
            },
            {
              group: 'DOCUMENTS',
              items: documents.map((e) => ({
                id: e.id,
                title: e.title,
                subtitle: e.clientName,
                href: '/documents',
              })),
            },
            {
              group: 'HEARINGS',
              items: hearings.map((e) => {
                var t;
                return {
                  id: e.id,
                  title: null != (t = e.purpose) ? t : 'Hearing',
                  subtitle: e.caseNumber,
                  href: '/cases/'.concat(e.caseId),
                };
              }),
            },
            {
              group: 'RECEIPTS',
              items: receipts.map((e) => ({
                id: e.id,
                title: 'Receipt '.concat(e.numberDisplay),
                subtitle: e.clientName,
                href: '/finance',
              })),
            },
          ];
          return {
            query: String(null != (en = t.q) ? en : ''),
            groups: e
              .filter((e) => !t.groups || String(t.groups).split(',').includes(e.group))
              .map((e) => {
                var a;
                let n = e.items.filter((e) => matchesQuery(e, t.q));
                return {
                  group: e.group,
                  total: n.length,
                  hits: n.slice(0, Number(null != (a = t.limit) ? a : 5)).map((t) => ({
                    ...t,
                    group: e.group,
                    meta: null,
                    score: 1,
                  })),
                };
              }),
            usedFuzzy: !1,
            tookMs: 1,
          };
        }
        return [];
      })(e, ei),
    );
  let er = p.body && 'object' == typeof p.body ? p.body : {},
    eo = 'string' == typeof er.idempotencyKey ? ''.concat(e, ':').concat(er.idempotencyKey) : null;
  if (eo && idempotencyResults.has(eo)) return clone(idempotencyResults.get(eo));
  let es = (function (e, t, a, l) {
    var c,
      m,
      p,
      Y,
      G,
      q,
      W,
      Q,
      J,
      Z,
      $,
      en,
      ei,
      er,
      eo,
      es,
      el,
      ed,
      ec,
      eu,
      em,
      ep,
      ef,
      eA,
      eg,
      eE,
      eI,
      eN,
      eh,
      ey,
      eT,
      eC,
      eS,
      eD,
      ev,
      eO,
      eb,
      ew,
      eR,
      ek,
      ex,
      eL,
      eM,
      eP,
      eF,
      e_,
      ej,
      eB,
      eH,
      eU,
      eY,
      eG,
      eV,
      eK,
      eq;
    let eW = e.split('/').filter(Boolean),
      eQ = eW[1];
    if (e.startsWith('/auth/')) {
      if ('/auth/profile' === e)
        return (
          Object.assign(accountProfile, a),
          accountProfile.version++,
          (previewUser.fullName = accountProfile.fullName),
          accountProfile
        );
      if ('/auth/profile/avatar' === e) return accountProfile;
      if (e.startsWith('/auth/sessions/')) {
        let e = sessions.findIndex((e) => e.id === eW[2]);
        e >= 0 && sessions.splice(e, 1);
      }
      return '/auth/login' === e
        ? {
            user: previewUser,
          }
        : {
            ok: !0,
            previewOnly: !0,
          };
    }
    if ('/office/settings' === e) {
      for (let [e, t] of Object.entries(a))
        e in officeSettings && t && 'object' == typeof t && Object.assign(officeSettings[e], t);
      return officeSettings;
    }
    if ('/office' === e || e.startsWith('/office/branding/'))
      return (
        Object.assign(officeProfile, a),
        (previewUser.officeName = officeProfile.name),
        officeProfile
      );
    if ('clients' === eW[0]) {
      let n =
        '/clients' === e
          ? null != (c = clients.find((e) => e.id === fixtureIds.case))
            ? c
            : {
                ...clone(clients[0]),
                id: fixtureIds.case,
              }
          : clientFor(eQ);
      return 'DELETE' === t
        ? (clients.splice(clients.indexOf(n), 1),
          {
            id: n.id,
          })
        : (Object.assign(n, a, {
            updatedAt: timestamp(),
            version: n.version + 1,
          }),
          clients.includes(n) || clients.push(n),
          n);
    }
    if ('cases' === eW[0]) {
      let n =
        '/cases' === e
          ? null != (m = cases.find((e) => e.id === fixtureIds.client))
            ? m
            : {
                ...clone(cases[0]),
                id: fixtureIds.client,
                status: 'NOTIFICATION',
                powersOfAttorney: [],
                statusHistory: [],
                counts: {
                  hearings: 0,
                  documents: 0,
                  tasks: 0,
                  notes: 0,
                },
              }
          : caseFor(eQ);
      if ('powers-of-attorney' === eW[2]) {
        if ('DELETE' === t) n.powersOfAttorney = n.powersOfAttorney.filter((e) => e.id !== eW[3]);
        else {
          let e =
            null != (p = n.powersOfAttorney.find((e) => e.id === eW[3]))
              ? p
              : {
                  id: createId(),
                  isExpired: !1,
                };
          return (
            Object.assign(
              e,
              {
                issuer: null,
                expiresAt: null,
                scope: null,
                notes: null,
                documentId: null,
              },
              a,
            ),
            n.powersOfAttorney.includes(e) || n.powersOfAttorney.push(e),
            (n.compliance.missingCertifiedPoa = !n.powersOfAttorney.some(
              (e) => e.certified && !e.isExpired,
            )),
            e
          );
        }
        return {
          id: eW[3],
        };
      }
      if ('status' === eW[2]) {
        let e = n.status;
        return (
          (n.status = a.toStatus),
          n.version++,
          (n.closedAt = 'CLOSED' === a.toStatus ? a.effectiveAt : null),
          (n.archivedAt = 'ARCHIVED' === a.toStatus ? timestamp() : null),
          n.statusHistory.push({
            id: createId(),
            fromStatus: e,
            toStatus: n.status,
            effectiveAt: null != (Y = a.effectiveAt) ? Y : todayKey,
            reason: null != (G = a.reason) ? G : null,
            actorLabel: 'Office Manager',
            documentId: null != (q = a.documentId) ? q : null,
            createdAt: timestamp(),
          }),
          a.nextHearingDate &&
            hearings.push(
              createHearing({
                caseId: n.id,
                date: a.nextHearingDate,
              }),
            ),
          a.expectedJudgmentDate &&
            events.push({
              ...clone(events[0]),
              id: createId(),
              type: 'REMINDER',
              title: 'Expected judgment',
              date: a.expectedJudgmentDate,
              caseId: n.id,
              time: null,
              endTime: null,
              allDay: !0,
            }),
          {
            status: n.status,
          }
        );
      }
      if ('fees' === eW[2]) {
        let e =
          null != (W = feeAgreements.find((e) => e.caseId === n.id))
            ? W
            : {
                id: createId(),
                caseId: n.id,
                model: 'FIXED',
                totalAmount: '0',
                percentageBps: null,
                signedAt: todayKey,
                notes: null,
                installments: [],
                version: 1,
              };
        return (
          (e.totalAmount = String(a.totalAmount)),
          e.version++,
          feeAgreements.includes(e) || feeAgreements.push(e),
          (n.compliance.missingFeeAgreement = !1),
          caseFeeSummary(n.id)
        );
      }
      if ('payments' === eW[2]) {
        let e = receipts.find((e) => e.caseId === n.id && 'ISSUED' === e.status && !e.isCreditNote);
        return (
          e ||
            ((e = createReceipt({
              caseId: n.id,
              clientId: n.clientId,
              amount: caseFeeSummary(n.id).agreed,
              description: 'Sample case fee payment',
            })),
            receipts.push(e)),
          recordPayment(e, a),
          caseFeeSummary(n.id)
        );
      }
      if ('favorite' === eW[2]) return ((n.isFavorite = !!a.isFavorite), n);
      let r =
        (Object.assign(n, a),
        (n.clientName = clientFor(n.clientId).fullName),
        (n.parties = n.parties.map((e) =>
          'CLIENT' === e.side
            ? {
                ...e,
                name: n.clientName,
                clientId: n.clientId,
                role: n.clientRole,
              }
            : e,
        )),
        (n.courtName =
          null != (eK = null == (eG = courts.find((e) => e.id === n.courtId)) ? void 0 : eG.name)
            ? eK
            : courts[0].name),
        (n.numberDisplay = ''.concat(n.serial, ' / ').concat(n.typeCode, ' / ').concat(n.year)),
        a.opponents &&
          (n.parties = [
            ...n.parties.filter((e) => 'OPPONENT' !== e.side),
            ...a.opponents.map((e) => {
              var t, a, n, i, r;
              return {
                id: null != (t = e.id) ? t : createId(),
                side: 'OPPONENT',
                role: null != (a = e.role) ? a : 'DEFENDANT',
                name: e.name,
                counselName: null != (n = e.counselName) ? n : null,
                address: null != (i = e.address) ? i : null,
                phone: null != (r = e.phone) ? r : null,
                clientId: null,
              };
            }),
          ]),
        a.assignedLawyerIds &&
          (n.assignedLawyers = a.assignedLawyerIds.map((e, t) => {
            var a, n;
            return {
              id: e,
              fullName:
                null != (n = null == (a = lawyers.find((t) => t.id === e)) ? void 0 : a.fullName)
                  ? n
                  : 'Sample Lawyer',
              isLead: 0 === t,
            };
          })),
        (n.opponentName =
          null !=
          (eq = null == (eV = n.parties.find((e) => 'OPPONENT' === e.side)) ? void 0 : eV.name)
            ? eq
            : null),
        (n.version += 1),
        (n.lastActivityAt = timestamp()),
        n);
      return (cases.includes(r) || cases.push(r), r);
    }
    if ('hearings' === eW[0]) {
      let e = hearings.find((e) => e.id === eQ);
      if ('DELETE' === t && e)
        return (
          (e.status = 'CANCELLED'),
          {
            id: eQ,
          }
        );
      if ('outcome' === eW[2] && e) {
        if (
          ((e.outcome = a.outcome),
          (e.outcomeNotes = null != (Q = a.notes) ? Q : null),
          (e.status = 'HELD'),
          (e.adjournmentReason = null != (J = a.adjournmentReason) ? J : null),
          a.nextDate)
        ) {
          let t = createHearing({
            caseId: e.caseId,
            date: a.nextDate,
            time: a.nextTime,
          });
          (hearings.push(t), (e.nextHearingId = t.id), (e.nextHearingAt = t.scheduledAt));
        }
        return e;
      }
      if (e) {
        let t = createHearing({
          ...e,
          ...a,
          caseId: e.caseId,
        });
        return (
          Object.assign(e, t, {
            id: e.id,
          }),
          e
        );
      }
      let n = createHearing(a);
      return (hearings.push(n), n);
    }
    if ('events' === eW[0]) {
      let e = events.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && events.splice(events.indexOf(e), 1),
          {
            removed: 1,
          }
        );
      let n =
        null != e
          ? e
          : {
              ...clone(
                null != (Z = events[0])
                  ? Z
                  : {
                      recurrence: 'NONE',
                      reminderOffsets: [],
                    },
              ),
              id: createId(),
            };
      return (
        Object.assign(
          n,
          {
            time: null,
            endTime: null,
            location: null,
            notes: null,
            caseId: null,
            ownerId: fixtureIds.owner,
            ownerName: 'Office Manager',
            seriesId: null,
            recurrenceEnd: null,
          },
          a,
        ),
        (n.version = (null != ($ = n.version) ? $ : 0) + 1),
        e || events.push(n),
        {
          ...n,
          occurrences: 1,
        }
      );
    }
    if ('tasks' === eW[0]) {
      let e = tasks.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && tasks.splice(tasks.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      let n =
        null != e
          ? e
          : {
              ...clone(tasks[0]),
              id: createId(),
              status: 'OPEN',
              doneAt: null,
              caseId: null,
              caseNumber: null,
              assigneeId: null,
              assigneeName: null,
              dueAt: null,
              dateKey: null,
              description: null,
            };
      return (
        'complete' === eW[2]
          ? ((n.status = a.done ? 'DONE' : 'OPEN'),
            (n.doneAt = a.done ? timestamp() : null),
            (n.isOverdue = !1))
          : (Object.assign(n, a),
            (n.dateKey =
              null != (er = null == (en = n.dueAt) ? void 0 : en.slice(0, 10)) ? er : null),
            (n.caseNumber = n.caseId ? caseFor(n.caseId).numberDisplay : null),
            (n.assigneeName = n.assigneeId
              ? null !=
                (eo =
                  null == (ei = users.find((e) => e.id === n.assigneeId)) ? void 0 : ei.fullName)
                ? eo
                : 'Office Manager'
              : null)),
        n.version++,
        e || tasks.push(n),
        n
      );
    }
    if ('transactions' === eW[0]) {
      let e = transactions.find((e) => e.id === eQ),
        t =
          null != e
            ? e
            : {
                ...clone(transactions[0]),
                id: createId(),
              };
      return (
        Object.assign(t, a),
        (t.clientName = clientFor(t.clientId).fullName),
        (t.assignedLawyerName =
          null !=
          (el =
            null == (es = lawyers.find((e) => e.id === t.assignedLawyerId)) ? void 0 : es.fullName)
            ? el
            : 'Sample Lawyer'),
        t.version++,
        e || transactions.push(t),
        t
      );
    }
    if ('/finance/accounts' === e || /^\/finance\/accounts\/[^/]+$/.test(e)) {
      let e = financeAccounts.find((e) => e.id === eW[2]),
        t =
          null != e
            ? e
            : {
                id: createId(),
                title: '',
                partyName: null,
                clientId: null != (ec = a.clientId) ? ec : null,
                clientName: a.clientId ? clientFor(a.clientId).fullName : null,
                transactionId: null != (eu = a.transactionId) ? eu : null,
                transactionType:
                  a.transactionId &&
                  null !=
                    (em =
                      null == (ed = transactions.find((e) => e.id === a.transactionId))
                        ? void 0
                        : ed.type)
                    ? em
                    : null,
                agreed: '0',
                received: '0',
                remaining: '0',
                expenses: '0',
                billableExpenses: '0',
                version: 0,
                notes: null,
                dueAt: null,
                movements: [],
              };
      return (
        Object.assign(t, {
          title: null != (ep = a.title) ? ep : t.title,
          partyName: null != (ef = a.partyName) ? ef : t.partyName,
          agreed: String(null != (eA = a.totalAmount) ? eA : t.agreed),
          notes: null != (eg = a.notes) ? eg : null,
          dueAt: null != (eE = a.dueAt) ? eE : null,
        }),
        t.version++,
        refreshAccount(t),
        e || financeAccounts.push(t),
        t
      );
    }
    if (/^\/finance\/accounts\/[^/]+\/movements$/.test(e)) {
      let e = null != (eI = financeAccounts.find((e) => e.id === eW[2])) ? eI : financeAccounts[0],
        t = {
          id: createId(),
          kind: a.kind,
          amount: String(a.amount),
          occurredAt: null != (eN = a.occurredAt) ? eN : todayKey,
          description: null != (eh = a.description) ? eh : 'Sample movement',
          method: null != (ey = a.method) ? ey : null,
          reference: null != (eT = a.reference) ? eT : null,
          category: null != (eC = a.category) ? eC : null,
          billable: !!a.billable,
          receiptNumber: 'PAYMENT' === a.kind ? 200 + nextIdCounter : null,
          recordedBy: 'Office Manager',
          voidedAt: null,
          voidReason: null,
        };
      return (e.movements.push(t), e.version++, refreshAccount(e));
    }
    if (/^\/finance\/movements\/[^/]+\/void$/.test(e)) {
      let e =
          null != (eS = financeAccounts.find((e) => e.movements.some((e) => e.id === eW[2])))
            ? eS
            : financeAccounts[0],
        t = e.movements.find((e) => e.id === eW[2]);
      return (
        t && ((t.voidedAt = timestamp()), (t.voidReason = a.reason)),
        e.version++,
        refreshAccount(e)
      );
    }
    if ('receipts' === eW[0]) {
      let e = receipts.find((e) => e.id === eQ);
      if ('void' === eW[2] && e)
        return ((e.status = 'VOIDED'), (e.voidedAt = timestamp()), (e.voidReason = a.reason), e);
      if ('credit-note' === eW[2] && e) {
        let t = createReceipt({
          ...a,
          clientId: e.clientId,
          caseId: e.caseId,
          description: a.reason,
          amount: (-BigInt(a.amount)).toString(),
        });
        return ((t.isCreditNote = !0), (t.correctsInvoiceId = e.id), receipts.push(t), t);
      }
      let t = createReceipt(a);
      return (receipts.push(t), t);
    }
    if ('/payments' === e)
      return recordPayment(
        null != (eD = receipts.find((e) => e.id === a.invoiceId)) ? eD : receipts[0],
        a,
      );
    if ('expenses' === eW[0]) {
      let e = expenses.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && expenses.splice(expenses.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      let n =
        null != e
          ? e
          : {
              id: createId(),
              caseId: null != (ev = a.caseId) ? ev : null,
              caseNumber: a.caseId ? caseFor(a.caseId).numberDisplay : null,
              category: 'OTHER',
              amount: '0',
              spentAt: todayKey,
              description: '',
              billable: !1,
              paidBy: 'Office Manager',
              version: 0,
            };
      return (
        Object.assign(n, a),
        (n.amount = String(a.amount)),
        n.version++,
        e || expenses.push(n),
        n
      );
    }
    if ('/fee-agreements' === e) {
      let e = {
        id: createId(),
        caseId: a.caseId,
        model: a.model,
        totalAmount: null != (eO = a.totalAmount) ? eO : null,
        percentageBps: null != (eb = a.percentageBps) ? eb : null,
        signedAt: null != (ew = a.signedAt) ? ew : null,
        notes: null != (eR = a.notes) ? eR : null,
        version: 1,
        installments: (null != (ek = a.installments) ? ek : []).map((e, t) => {
          var a;
          return {
            id: createId(),
            sequence: t + 1,
            label: e.label,
            amount: e.amount,
            dueAt: null != (a = e.dueAt) ? a : null,
          };
        }),
      };
      return (feeAgreements.push(e), (caseFor(a.caseId).compliance.missingFeeAgreement = !1), e);
    }
    if ('roles' === eW[0]) {
      let e = roles.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && !e.isSystem && roles.splice(roles.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      let i =
        null != e
          ? e
          : {
              id: createId(),
              key: a.key,
              nameAr: a.nameAr,
              descriptionAr: null != (ex = a.descriptionAr) ? ex : null,
              permissions: [],
              isSystem: !1,
              userCount: 0,
              version: 0,
            };
      return (
        'reset' === eW[2]
          ? (i.permissions = [...(null != (eL = shared.SYSTEM_ROLE_PERMISSIONS[i.key]) ? eL : [])])
          : Object.assign(i, a),
        i.version++,
        e || roles.push(i),
        i
      );
    }
    if ('users' === eW[0]) {
      let e = users.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && e.id !== fixtureIds.owner && users.splice(users.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      if ('reset-password' === eW[2])
        return {
          temporaryPassword: 'Preview only — no live password',
        };
      let n = null != (eM = roles.find((e) => e.id === a.roleId)) ? eM : roles[1],
        r =
          null != e
            ? e
            : {
                id: createId(),
                fullName: a.fullName,
                email: a.email,
                phone: null != (eP = a.phone) ? eP : null,
                status: 'ACTIVE',
                roleId: n.id,
                roleNameAr: n.nameAr,
                roleKey: n.key,
                lastLoginAt: null,
                activeSessions: 0,
                mustChangePassword: !0,
                version: 0,
                createdAt: timestamp(),
              };
      return (Object.assign(r, {
        ...a,
        roleId: null != (eF = a.roleId) ? eF : r.roleId,
      }),
      r.version++,
      e)
        ? r
        : (users.push(r),
          {
            user: r,
            temporaryPassword: 'Preview only — no live password',
            emailSent: !1,
          });
    }
    if ('courts' === eW[0]) {
      if ('seed-defaults' === eW[1])
        return {
          created: 0,
          skipped: courts.length,
          catalogVersion: 'preview',
        };
      let e = courts.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && courts.splice(courts.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      let n =
        null != e
          ? e
          : {
              ...clone(courts[0]),
              id: createId(),
              caseCount: 0,
            };
      return (Object.assign(n, a), n.version++, e || courts.push(n), n);
    }
    if ('lawyers' === eW[0]) {
      let e = lawyers.find((e) => e.id === eQ);
      if ('DELETE' === t)
        return (
          e && lawyers.splice(lawyers.indexOf(e), 1),
          {
            id: eQ,
          }
        );
      if ('assets' === eW[2] && 'upload-init' === eW[4])
        return {
          objectKey: 'preview-only',
          uploadUrl: '',
          requiredContentType: a.mimeType,
          expiresInSeconds: 0,
        };
      let n =
        null != e
          ? e
          : {
              ...clone(lawyers[0]),
              id: createId(),
              assignedCaseCount: 0,
            };
      return (Object.assign(n, a), n.version++, e || lawyers.push(n), n);
    }
    if ('saved-searches' === eW[0]) {
      if ('DELETE' === t) {
        let e = savedSearches.findIndex((e) => e.id === eQ);
        return (
          e >= 0 && savedSearches.splice(e, 1),
          {
            id: eQ,
          }
        );
      }
      let e = {
        id: createId(),
        ...a,
        ownerId: fixtureIds.owner,
        ownerName: 'Office Manager',
        isMine: !0,
        createdAt: timestamp(),
      };
      return (savedSearches.push(e), e);
    }
    if ('/notifications/preferences' === e)
      return (notificationPreferences = {
        ...notificationPreferences,
        ...a,
      });
    if ('/notifications/read' === e) {
      let e = 0;
      for (let t of notifications)
        (a.all || (null == (e_ = a.ids) ? void 0 : e_.includes(t.id))) &&
          ((t.readAt = timestamp()), e++);
      return {
        updated: e,
      };
    }
    if (e.startsWith('/whatsapp/automations/')) {
      let e = automationTemplates.find((e) => e.eventKey === eW[2]);
      return (Object.assign(e, a), e.version++, e);
    }
    if ('/whatsapp/messages' === e) {
      let e =
          'lawyer' === a.recipientType
            ? lawyers.find((e) => e.id === a.recipientId)
            : clientFor(a.recipientId),
        t = {
          id: createId(),
          recipientType: a.recipientType,
          recipientId: a.recipientId,
          recipientName: null != (ej = null == e ? void 0 : e.fullName) ? ej : 'Sample recipient',
          phone:
            null !=
            (eH = null != (eB = null == e ? void 0 : e.mobile) ? eB : null == e ? void 0 : e.phone)
              ? eH
              : '',
          body: null != (eU = a.body) ? eU : '',
          kind: 'custom',
          status: 'skipped',
          lastError: 'Preview only. This message was saved in memory and was not sent.',
          createdAt: timestamp(),
          updatedAt: timestamp(),
          attachmentFileName: null,
        };
      return (whatsappMessages.unshift(t), t);
    }
    if ('/whatsapp/connection/connect' === e)
      return ((whatsappConnection.status = 'qr_ready'), whatsappConnection);
    if ('/mailboxes' === e) {
      let e = {
        email: ''.concat(a.localPart, '@devshub.example'),
        name: a.name,
        protected: !1,
        createdAt: timestamp(),
      };
      return (mailboxes.push(e), e);
    }
    if ('mailboxes' === eW[0])
      return null !=
        (eY = mailboxes.find((e) =>
          e.email.startsWith(''.concat(decodeURIComponent(null != eQ ? eQ : ''), '@')),
        ))
        ? eY
        : mailboxes[1];
    if ('documents' === eW[0]) {
      if ('DELETE' === t) {
        let e = documents.findIndex((e) => e.id === eQ);
        return (
          e >= 0 && documents.splice(e, 1),
          {
            id: eQ,
          }
        );
      }
      if ('upload-init' === eW[1])
        return {
          objectKey: 'preview-only',
          uploadUrl: '',
          requiredContentType: a.mimeType,
          expiresInSeconds: 0,
        };
      let e = {
        ...clone(documents[0]),
        ...a,
        id: createId(),
        version: 1,
        versions: [],
        tags: [],
        createdAt: timestamp(),
      };
      return (documents.push(e), e);
    }
    if ('/data/backups' === e) {
      let e = {
        ...clone(backups[0]),
        id: createId(),
        createdAt: timestamp(),
      };
      return (backups.unshift(e), e);
    }
    return '/data/import' === e
      ? {
          dryRun: !0,
          imported: {},
          skipped: {},
          warningsAr: ['Preview only. No data was imported.'],
          errors: [],
        }
      : {
          ok: !0,
          previewOnly: !0,
        };
  })(e, en, er, 0);
  return (eo && idempotencyResults.set(eo, clone(es)), clone(es));
}

export { previewRequest, previewUser };
