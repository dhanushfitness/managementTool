export const getWatchDogEmpCode = (member) => {
    return member.memberId;
};

export const formatWatchDogDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

export const normalizeWatchDogMobile = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^\\d]/g, '').replace(/^91/, '');
};

export const buildWatchDogEmployeePayload = (member) => {
    return {
        emp_code: getWatchDogEmpCode(member) || member.memberId,
        first_name: member.firstName,
        last_name: member.lastName || '',
        mobile: normalizeWatchDogMobile(member.phone || ''),
        email: member.email || '',
        gender: member.gender?.toLowerCase() === 'female' ? 'F' : 'M',
        hire_date: member.createdAt ? formatWatchDogDate(member.createdAt) : new Date().toISOString().split('T')[0],
        verify_mode: -1,
        emp_type: 1,
        enable_att: true,
        department: '1',
        position: '1',
        area: ['2,GYM']
    };
};

export const buildWatchDogValidityPayload = ({ empCode, validityStart, validityEnd }) => {
    const payload = {
        emp_code: empCode,
        department: '1',
        position: '1',
        area: ['2,GYM']
    };

    const formattedStart = formatWatchDogDate(validityStart);
    const formattedEnd = formatWatchDogDate(validityEnd);

    if (formattedStart) payload.validity_start = formattedStart;
    if (formattedEnd) payload.validity_end = formattedEnd;

    return payload;
};
