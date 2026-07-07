export enum SalaryDesignationEnum {
  FIELD_ASSOCIATE = 'Field Associate',
  BUSINESS_EXECUTIVE = 'Business Executive',
  SENIOR_BUSINESS_EXECUTIVE = 'Senior Business Executive',
  DEVELOPMENT_MANAGER = 'Development Manager',
  SENIOR_DEVELOPMENT_MANAGER = 'Senior Development Manager',
  RELATIONSHIP_MANAGER = 'Relationship Manager',
  SENIOR_RELATIONSHIP_MANAGER = 'Senior Relationship Manager',
  CLUSTER_MANAGER = 'Cluster Manager',
  CLUSTER_HEAD = 'Cluster Head',
  REGIONAL_MANAGER = 'Regional Manager',
  ZONAL_MANAGER = 'Zonal Manager',
  ZONAL_HEAD = 'Zonal Head',
}

type SalaryInfo = {
  designation: SalaryDesignationEnum
  criteria: number
  monthlyIncentive: number
  houseFund: number | null
  travelAllowance: number
  carFund: number | null
}

export const SALARY_CONFIG: Record<SalaryDesignationEnum, SalaryInfo> = {
  [SalaryDesignationEnum.FIELD_ASSOCIATE]: {
    designation: SalaryDesignationEnum.FIELD_ASSOCIATE,
    criteria: 200000,
    monthlyIncentive: 2000,
    houseFund: null,
    travelAllowance: 1000,
    carFund: null,
  },
  [SalaryDesignationEnum.BUSINESS_EXECUTIVE]: {
    designation: SalaryDesignationEnum.BUSINESS_EXECUTIVE,
    criteria: 500000,
    monthlyIncentive: 3000,
    houseFund: null,
    travelAllowance: 1500,
    carFund: null,
  },
  [SalaryDesignationEnum.SENIOR_BUSINESS_EXECUTIVE]: {
    designation: SalaryDesignationEnum.SENIOR_BUSINESS_EXECUTIVE,
    criteria: 1000000,
    monthlyIncentive: 5000,
    houseFund: null,
    travelAllowance: 2000,
    carFund: 1000,
  },
  [SalaryDesignationEnum.DEVELOPMENT_MANAGER]: {
    designation: SalaryDesignationEnum.DEVELOPMENT_MANAGER,
    criteria: 2500000,
    monthlyIncentive: 7000,
    houseFund: 1000,
    travelAllowance: 2500,
    carFund: 1500,
  },
  [SalaryDesignationEnum.SENIOR_DEVELOPMENT_MANAGER]: {
    designation: SalaryDesignationEnum.SENIOR_DEVELOPMENT_MANAGER,
    criteria: 4000000,
    monthlyIncentive: 12000,
    houseFund: 2000,
    travelAllowance: 3000,
    carFund: 2000,
  },
  [SalaryDesignationEnum.RELATIONSHIP_MANAGER]: {
    designation: SalaryDesignationEnum.RELATIONSHIP_MANAGER,
    criteria: 7000000,
    monthlyIncentive: 20000,
    houseFund: 3500,
    travelAllowance: 3500,
    carFund: 3500,
  },
  [SalaryDesignationEnum.SENIOR_RELATIONSHIP_MANAGER]: {
    designation: SalaryDesignationEnum.SENIOR_RELATIONSHIP_MANAGER,
    criteria: 15000000,
    monthlyIncentive: 25000,
    houseFund: 5000,
    travelAllowance: 5000,
    carFund: 5000,
  },
  [SalaryDesignationEnum.CLUSTER_MANAGER]: {
    designation: SalaryDesignationEnum.CLUSTER_MANAGER,
    criteria: 40000000,
    monthlyIncentive: 50000,
    houseFund: 15000,
    travelAllowance: 15000,
    carFund: 15000,
  },
  [SalaryDesignationEnum.CLUSTER_HEAD]: {
    designation: SalaryDesignationEnum.CLUSTER_HEAD,
    criteria: 100000000,
    monthlyIncentive: 100000,
    houseFund: 25000,
    travelAllowance: 25000,
    carFund: 25000,
  },
  [SalaryDesignationEnum.REGIONAL_MANAGER]: {
    designation: SalaryDesignationEnum.REGIONAL_MANAGER,
    criteria: 300000000,
    monthlyIncentive: 300000,
    houseFund: 100000,
    travelAllowance: 50000,
    carFund: 100000,
  },
  [SalaryDesignationEnum.ZONAL_MANAGER]: {
    designation: SalaryDesignationEnum.ZONAL_MANAGER,
    criteria: 500000000,
    monthlyIncentive: 600000,
    houseFund: 200000,
    travelAllowance: 100000,
    carFund: 200000,
  },
  [SalaryDesignationEnum.ZONAL_HEAD]: {
    designation: SalaryDesignationEnum.ZONAL_HEAD,
    criteria: 1000000000,
    monthlyIncentive: 1000000,
    houseFund: 500000,
    travelAllowance: 200000,
    carFund: 500000,
  },
}
