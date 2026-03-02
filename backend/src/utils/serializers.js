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

module.exports = {
  serializeCertificate,
};

