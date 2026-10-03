/**
 * 预约人身份校验（校内 / 校外）
 * ----------------------------------------------------------------------------
 * 本期只面向校内场馆，但预约人可能是校外人员（陪同入场、赛事外来人员等）。
 * 因此把「身份」显式建模为两种，各自的证件规则不同：
 *
 * - STUDENT（在校生）：学号，6-12 位数字
 * - VISITOR（校外人员）：身份证号，15 或 18 位（末位可为 X/x）
 *
 * 服务端字段到位前，这些值只用于前端校验与随行展示；后端落库后即可生效。
 */

export type IdentityType = 'STUDENT' | 'VISITOR';

export const IDENTITY_LABEL: Record<IdentityType, string> = {
  STUDENT: '在校生',
  VISITOR: '校外人员',
};

export const IDENTITY_PLACEHOLDER: Record<IdentityType, string> = {
  STUDENT: '请输入学号',
  VISITOR: '请输入身份证号',
};

/** 姓名：1-20 个字符，去首尾空格 */
export function isValidName(name: string): boolean {
  const trimmed = (name || '').trim();
  return trimmed.length > 0 && trimmed.length <= 20;
}

/** 手机号：11 位、以 1 开头、第二位 3-9 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test((phone || '').trim());
}

/** 在校生学号：6-12 位数字 */
export function isValidStudentNo(value: string): boolean {
  return /^\d{6,12}$/.test((value || '').trim());
}

/**
 * 校外人员证件号：15 位数字，或 18 位（末位可为 X）。
 * 兼容用户只填身份证后若干位的情况不放开——宁可严格，也别放进无效证件。
 */
export function isValidVisitorId(value: string): boolean {
  const id = (value || '').trim().toUpperCase();
  if (/^\d{15}$/.test(id)) return true;
  return /^\d{17}[\dX]$/.test(id);
}

/** 按身份类型校验证件号 */
export function isValidIdentityNo(
  type: IdentityType,
  value: string,
): boolean {
  return type === 'VISITOR'
    ? isValidVisitorId(value)
    : isValidStudentNo(value);
}

/** 证件号输入清洗：只保留数字与末尾可能的 X */
export function sanitizeIdentityNo(value: string): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
    .slice(0, 18);
}

/** 证件号输入清洗：仅数字 */
export function sanitizeStudentNo(value: string): string {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 12);
}

/**
 * 校验一位预约人（联系人或同行人）。
 * 返回错误文案；通过则返回空串。
 */
export function validatePerson(
  person: {
    name: string;
    phone: string;
    identityType: IdentityType;
    identityNo: string;
  },
  label = '预约人',
): string {
  if (!isValidName(person.name)) {
    return `请输入${label}真实姓名`;
  }
  if (!isValidPhone(person.phone)) {
    return `请输入${label}正确的 11 位手机号`;
  }
  if (!isValidIdentityNo(person.identityType, person.identityNo)) {
    return person.identityType === 'VISITOR'
      ? `请输入${label}正确的身份证号`
      : `请输入${label} 6-12 位数字学号`;
  }
  return '';
}

/** 证件号展示脱敏：学号保留后 4 位，身份证保留后 4 位 */
export function maskIdentityNo(value: string): string {
  const text = String(value || '').trim();
  if (text.length <= 4) return text;
  return `${'*'.repeat(text.length - 4)}${text.slice(-4)}`;
}
