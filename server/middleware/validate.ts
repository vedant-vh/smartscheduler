import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const validate = (validations: ValidationChain[]) => async (req: Request, res: Response, next: NextFunction) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

export default validate;
