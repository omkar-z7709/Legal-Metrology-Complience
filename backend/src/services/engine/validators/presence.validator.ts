import { IValidator, ValidationCheckResult } from "./validator.interface.js";
import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

export class PresenceValidator implements IValidator {
  name = "PresenceValidator";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];

    // 1. Manufacturer / Packer Identity Check (Rule 6(1)(a))
    const hasMfg = declarations.manufacturer.value !== null && declarations.manufacturer.value.length > 2;
    const hasPacker = declarations.packer.value !== null && declarations.packer.value.length > 2;

    if (hasMfg || hasPacker) {
      results.push({
        ruleId: "RULE-6-1-A-NAME-ADDRESS",
        ruleNumber: "Rule 6(1)(a)",
        fieldName: "manufacturer",
        status: "PASS",
        severity: "HIGH",
        title: "Manufacturer / Packer Identification",
        reason: "Valid manufacturer/packer details detected on commodity label.",
        evidence: declarations.manufacturer.source_text || declarations.packer.source_text || "Found identity declaration",
        confidence: declarations.manufacturer.confidence || 0.95,
        boundingBox: declarations.manufacturer.bbox,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-A-NAME-ADDRESS",
        ruleNumber: "Rule 6(1)(a)",
        fieldName: "manufacturer",
        status: "FAIL",
        severity: "CRITICAL",
        title: "Missing Manufacturer / Packer Identity",
        reason: "Mandatory name and physical address of manufacturer or packer was not detected on the package label.",
        evidence: "No manufacturer or packer name detected in primary or secondary panels.",
        confidence: 0.94,
        suggestedAction: "Issue notice under Section 36 of Legal Metrology Act, 2009 for failure to disclose manufacturer identity.",
      });
    }

    // 2. Generic Name Check (Rule 6(1)(b))
    if (declarations.generic_name.value) {
      results.push({
        ruleId: "RULE-6-1-B-GENERIC-NAME",
        ruleNumber: "Rule 6(1)(b)",
        fieldName: "generic_name",
        status: "PASS",
        severity: "HIGH",
        title: "Generic / Common Commodity Name",
        reason: "Generic or common name of commodity is clearly declared.",
        evidence: declarations.generic_name.source_text || declarations.generic_name.value,
        confidence: declarations.generic_name.confidence || 0.95,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-B-GENERIC-NAME",
        ruleNumber: "Rule 6(1)(b)",
        fieldName: "generic_name",
        status: "REVIEW",
        severity: "HIGH",
        title: "Unverified Commodity Generic Name",
        reason: "Generic or common name could not be definitively extracted from package image.",
        evidence: "Commodity title was not isolated on Principal Display Panel.",
        confidence: 0.85,
      });
    }

    // 3. Country of Origin Check (Rule 6(1)(g))
    if (declarations.country_of_origin.value) {
      results.push({
        ruleId: "RULE-6-1-G-COUNTRY-ORIGIN",
        ruleNumber: "Rule 6(1)(g)",
        fieldName: "country_of_origin",
        status: "PASS",
        severity: "HIGH",
        title: "Country of Origin Declaration",
        reason: `Country of origin explicitly declared as '${declarations.country_of_origin.value}'.`,
        evidence: declarations.country_of_origin.source_text || `Origin: ${declarations.country_of_origin.value}`,
        confidence: declarations.country_of_origin.confidence || 0.95,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-G-COUNTRY-ORIGIN",
        ruleNumber: "Rule 6(1)(g)",
        fieldName: "country_of_origin",
        status: "FAIL",
        severity: "HIGH",
        title: "Missing Country of Origin",
        reason: "Mandatory Country of Origin declaration required under 2017 Amendment is absent.",
        evidence: "No 'Country of Origin' or 'Made in' statement detected on label.",
        confidence: 0.92,
        suggestedAction: "Require manufacturer to substantiate Country of Origin declaration on Principal Display Panel.",
      });
    }

    // 4. Consumer Care Check (Rule 6(1)(f))
    const hasCare = declarations.consumer_care.value !== null && declarations.consumer_care.value.length > 3;
    if (hasCare) {
      results.push({
        ruleId: "RULE-6-1-F-CONSUMER-CARE",
        ruleNumber: "Rule 6(1)(f)",
        fieldName: "consumer_care",
        status: "PASS",
        severity: "HIGH",
        title: "Consumer Care Contact Information",
        reason: "Consumer grievance contact details (phone/email/address) are provided.",
        evidence: declarations.consumer_care.source_text || declarations.consumer_care.value || "",
        confidence: declarations.consumer_care.confidence || 0.93,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-F-CONSUMER-CARE",
        ruleNumber: "Rule 6(1)(f)",
        fieldName: "consumer_care",
        status: "FAIL",
        severity: "HIGH",
        title: "Deficient Consumer Care Declaration",
        reason: "Mandatory telephone number, email, or physical address for consumer grievance was not found.",
        evidence: "No customer care helpline or contact email found on package.",
        confidence: 0.95,
        suggestedAction: "Flag violation under Rule 6(1)(f) and issue inspection notice.",
      });
    }

    return results;
  }
}
