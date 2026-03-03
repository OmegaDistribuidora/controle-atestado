function serializeCertificate(certificate) {
  return {
    id: certificate.id,
    startDate: certificate.startDate,
    endDate: certificate.endDate,
    registrationDate: certificate.registrationDate,
    employeeName: certificate.employeeName,
    cpf: certificate.cpf,
    cid: certificate.cid,
    totalDays: certificate.totalDays,
    createdBy: certificate.createdBy
      ? {
          id: certificate.createdBy.id,
          username: certificate.createdBy.username,
        }
      : null,
    attachments: (certificate.attachments || []).map((item) => item.filename),
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt,
  };
}

function serializeDeclaration(declaration) {
  return {
    id: declaration.id,
    declarationDate: declaration.declarationDate,
    registrationDate: declaration.registrationDate,
    employeeName: declaration.employeeName,
    cpf: declaration.cpf,
    startTime: declaration.startTime,
    endTime: declaration.endTime,
    totalMinutes: declaration.totalMinutes,
    totalHours: Number((declaration.totalMinutes / 60).toFixed(2)),
    createdBy: declaration.createdBy
      ? {
          id: declaration.createdBy.id,
          username: declaration.createdBy.username,
        }
      : null,
    attachments: (declaration.declarationFiles || []).map((item) => item.filename),
    createdAt: declaration.createdAt,
    updatedAt: declaration.updatedAt,
  };
}

module.exports = {
  serializeCertificate,
  serializeDeclaration,
};

