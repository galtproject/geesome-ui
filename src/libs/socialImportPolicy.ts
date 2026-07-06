export const defaultImportMediaPolicy = {
  images: 'preserve',
  linkPreviews: 'preserve',
  unsupportedEmbeds: 'preserve'
};

export const defaultImportRelationPolicy = {
  replies: 'preserve',
  quotes: 'preserve',
  reposts: 'preserve'
};

const importMediaPolicyValues = ['preserve', 'ignore', 'reject'];
const importRelationPolicyValues = ['preserve', 'omit', 'reject'];

export function getImportMediaPolicyInput(policy: any = {}) {
  return {
    images: getAllowedPolicyValue(policy.images, importMediaPolicyValues, defaultImportMediaPolicy.images),
    linkPreviews: getAllowedPolicyValue(policy.linkPreviews, importMediaPolicyValues, defaultImportMediaPolicy.linkPreviews),
    unsupportedEmbeds: getAllowedPolicyValue(
      policy.unsupportedEmbeds,
      importMediaPolicyValues,
      defaultImportMediaPolicy.unsupportedEmbeds
    )
  };
}

export function getImportRelationPolicyInput(policy: any = {}) {
  return {
    replies: getAllowedPolicyValue(policy.replies, importRelationPolicyValues, defaultImportRelationPolicy.replies),
    quotes: getAllowedPolicyValue(policy.quotes, importRelationPolicyValues, defaultImportRelationPolicy.quotes),
    reposts: getAllowedPolicyValue(policy.reposts, importRelationPolicyValues, defaultImportRelationPolicy.reposts)
  };
}

export function getNonDefaultPolicyLabel(label, value, defaultValue) {
  if (value === defaultValue) {
    return null;
  }
  return `${label} ${value}`;
}

function getAllowedPolicyValue(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}
